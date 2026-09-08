package com.ssafya701.roundy.session.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafya701.roundy.auth.enums.GenderType;
import com.ssafya701.roundy.auth.repository.UserRepository;
import com.ssafya701.roundy.verification.service.VerificationService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.IntStream;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@EnabledIfEnvironmentVariable(named = "ROUNDY_TEST_REDIS_PORT", matches = "\\d+")
class SessionQueueRedisTest {
    private static LettuceConnectionFactory factory;
    private static StringRedisTemplate redis;
    private SessionService sessions;
    private final List<Long> users = new ArrayList<>();

    @BeforeAll
    static void connect() {
        factory = new LettuceConnectionFactory("127.0.0.1", Integer.parseInt(System.getenv("ROUNDY_TEST_REDIS_PORT")));
        factory.afterPropertiesSet();
        redis = new StringRedisTemplate(factory);
    }

    @AfterAll
    static void disconnect() { factory.destroy(); }

    @BeforeEach
    void setUp() {
        // 기존 대기열이 있으면 변경하지 않고 중단한다. 전용 테스트 Redis만 사용한다.
        assertThat(redis.opsForZSet().zCard("session:male")).isZero();
        assertThat(redis.opsForZSet().zCard("session:female")).isZero();
        sessions = new SessionService(redis, redis, new ObjectMapper());
        sessions.init();
        var verification = new VerificationService(redis, mock(UserRepository.class));
        ReflectionTestUtils.setField(verification, "ttlSeconds", 300);
        long first = Math.abs(UUID.randomUUID().getMostSignificantBits() % 1_000_000_000L) + 10_000_000_000L;
        for (int i = 0; i < 7; i++) {
            long id = first + i;
            users.add(id);
            verification.startVerification(id, "request-" + id);
            verification.updateVerificationStatus(id, "request-" + id, true);
        }
    }

    @AfterEach
    void cleanUp() {
        for (Long id : users) {
            String room = sessions.getUserCurrentRoom(id);
            if (room != null) sessions.cleanupRoom(room);
            sessions.removeFromQueue(id, GenderType.MALE);
            sessions.removeFromQueue(id, GenderType.FEMALE);
            redis.delete("verify:" + id + ":request-" + id);
        }
    }

    private com.ssafya701.roundy.session.dto.RoomMatchResult enter(int index, GenderType gender) {
        Long id = users.get(index);
        return sessions.addToQueueAndMatch(id, gender, "request-" + id);
    }

    @Test
    void concurrentRequestsForOneUserConsumeVerificationOnceAndKeepOneSeat() throws Exception {
        var start = new CyclicBarrier(16);
        try (var workers = Executors.newFixedThreadPool(16)) {
            var calls = IntStream.range(0, 16).<Callable<String>>mapToObj(i -> () -> {
                start.await(10, TimeUnit.SECONDS);
                return enter(0, GenderType.MALE).getStatus();
            }).toList();
            for (var result : workers.invokeAll(calls)) assertThat(result.get()).isEqualTo("WAITING");
        }
        assertThat(redis.opsForZSet().zCard("session:male")).isEqualTo(1);
        assertThat(redis.hasKey("verify:" + users.getFirst() + ":request-" + users.getFirst())).isFalse();
    }

    @Test
    void concurrentSixPersonEntryAndPollingNeverRequeuesMatchedUsers() throws Exception {
        var start = new CyclicBarrier(6);
        try (var workers = Executors.newFixedThreadPool(6)) {
            var calls = IntStream.range(0, 6).<Callable<String>>mapToObj(i -> () -> {
                start.await(10, TimeUnit.SECONDS);
                return enter(i, i < 3 ? GenderType.MALE : GenderType.FEMALE).getStatus();
            }).toList();
            for (var result : workers.invokeAll(calls)) result.get();
        }
        Set<String> rooms = new HashSet<>();
        for (int i = 0; i < 6; i++) {
            var response = enter(i, i < 3 ? GenderType.MALE : GenderType.FEMALE);
            assertThat(response.getStatus()).isEqualTo("MATCHED");
            rooms.add(response.getRoomId());
        }
        assertThat(rooms).hasSize(1);
        assertThat(redis.opsForZSet().zCard("session:male")).isZero();
        assertThat(redis.opsForZSet().zCard("session:female")).isZero();
        var members = sessions.getRoomMembers(rooms.iterator().next());
        assertThat(members.getMales()).hasSize(3);
        assertThat(members.getFemales()).hasSize(3);
    }

    @Test
    void fourthManStaysQueuedWhenEarlierParticipantsMatch() {
        for (int i = 0; i < 4; i++) {
            enter(i, GenderType.MALE);
            redis.opsForZSet().add("session:male", users.get(i).toString(), i + 1);
        }
        for (int i = 4; i < 7; i++) enter(i, GenderType.FEMALE);
        assertThat(enter(3, GenderType.MALE).getStatus()).isEqualTo("WAITING");
        assertThat(sessions.getUserCurrentRoom(users.get(3))).isNull();
        assertThat(sessions.getQueuePosition(users.get(3), GenderType.MALE)).isEqualTo(1);
    }

    @Test
    void stalePollingLeaseCannotLeaveAGhostParticipant() {
        enter(0, GenderType.MALE);
        redis.opsForZSet().add("session:male:lease", users.getFirst().toString(), 0);
        enter(1, GenderType.MALE);
        assertThat(sessions.isInQueue(users.getFirst(), GenderType.MALE)).isFalse();
        assertThat(enter(0, GenderType.MALE).getStatus()).isEqualTo("REJECTED");
    }

    @Test
    void anotherUsersVerificationCannotEnterTheQueue() {
        var response = sessions.addToQueueAndMatch(users.get(1), GenderType.MALE, "request-" + users.getFirst());
        assertThat(response.getStatus()).isEqualTo("REJECTED");
        assertThat(redis.opsForZSet().zCard("session:male")).isZero();
        assertThat(enter(0, GenderType.MALE).getStatus()).isEqualTo("WAITING");
    }

    @Test
    void cancellationBeforeSixthEntryExcludesTheCancelledUser() {
        for (int i = 0; i < 5; i++) enter(i, i < 3 ? GenderType.MALE : GenderType.FEMALE);
        assertThat(sessions.removeFromQueue(users.getFirst(), GenderType.MALE)).isTrue();
        assertThat(enter(5, GenderType.FEMALE).getStatus()).isEqualTo("WAITING");
        var matched = enter(6, GenderType.MALE);
        assertThat(matched.getStatus()).isEqualTo("MATCHED");
        assertThat(sessions.getUserCurrentRoom(users.getFirst())).isNull();
        assertThat(redis.opsForSet().members("room:" + matched.getRoomId() + ":members"))
                .hasSize(6).doesNotContain(users.getFirst().toString());
        assertThat(enter(0, GenderType.MALE).getStatus()).isEqualTo("REJECTED");
    }

    @RepeatedTest(25)
    void cancellationRacingWithMatchHasOneAtomicWinner() throws Exception {
        for (int i = 0; i < 5; i++) enter(i, i < 3 ? GenderType.MALE : GenderType.FEMALE);
        var start = new CyclicBarrier(2);
        try (var workers = Executors.newFixedThreadPool(2)) {
            var cancellation = workers.submit(() -> {
                start.await(10, TimeUnit.SECONDS);
                return sessions.removeFromQueue(users.getFirst(), GenderType.MALE);
            });
            var match = workers.submit(() -> {
                start.await(10, TimeUnit.SECONDS);
                return enter(5, GenderType.FEMALE);
            });
            boolean cancelled = cancellation.get(10, TimeUnit.SECONDS);
            var result = match.get(10, TimeUnit.SECONDS);
            if (cancelled) {
                assertThat(result.getStatus()).isEqualTo("WAITING");
                assertThat(sessions.getUserCurrentRoom(users.getFirst())).isNull();
            } else {
                assertThat(result.getStatus()).isEqualTo("MATCHED");
                assertThat(sessions.getUserCurrentRoom(users.getFirst())).isEqualTo(result.getRoomId());
                var members = sessions.getRoomMembers(result.getRoomId());
                assertThat(members.getMales()).hasSize(3);
                assertThat(members.getFemales()).hasSize(3);
            }
            assertThat(sessions.isInQueue(users.getFirst(), GenderType.MALE)).isFalse();
        }
    }

    @Test
    void staleRoomCleanupMustPreserveNewRoomAssignment() {
        String oldRoom = "old-" + users.getFirst();
        String newRoom = "new-" + users.getFirst();
        String user = users.getFirst().toString();
        try {
            // 이전 방의 정리 작업이 늦게 도착한 상태. 새 방의 소유권은 보존해야 한다.
            redis.opsForSet().add("room:" + oldRoom + ":members", user);
            redis.opsForHash().put("room:" + oldRoom + ":member:" + user, "gender", "MALE");
            redis.opsForValue().set("room:" + oldRoom + ":created", "1");
            redis.opsForSet().add("room:" + newRoom + ":members", user);
            redis.opsForHash().put("room:" + newRoom + ":member:" + user, "gender", "MALE");
            redis.opsForValue().set("user:" + user + ":currentRoom", newRoom);

            sessions.cleanupRoom(oldRoom);
            sessions.cleanupRoom(oldRoom); // 중복 종료 이벤트도 멱등적으로 처리한다.

            assertThat(sessions.getUserCurrentRoom(users.getFirst())).isEqualTo(newRoom);
            assertThat(redis.hasKey("room:" + newRoom + ":member:" + user)).isTrue();
            assertThat(redis.hasKey("room:" + oldRoom + ":members")).isFalse();
            assertThat(redis.hasKey("room:" + oldRoom + ":member:" + user)).isFalse();
            assertThat(redis.hasKey("room:" + oldRoom + ":created")).isFalse();
        } finally {
            sessions.cleanupRoom(oldRoom);
            sessions.cleanupRoom(newRoom);
        }
    }

    @Test
    void cancelledRequestCannotEnterAgainWithoutNewVerification() {
        enter(0, GenderType.MALE);
        assertThat(sessions.removeFromQueue(users.getFirst(), GenderType.MALE)).isTrue();
        assertThat(enter(0, GenderType.MALE).getStatus()).isEqualTo("REJECTED");
        assertThat(redis.opsForZSet().score("session:male:lease", users.getFirst().toString())).isNull();
    }
}
