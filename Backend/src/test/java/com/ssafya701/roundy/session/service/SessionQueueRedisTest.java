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
        try (var workers = Executors.newFixedThreadPool(8)) {
            var calls = IntStream.range(0, 16).<Callable<String>>mapToObj(i -> () -> enter(0, GenderType.MALE).getStatus()).toList();
            for (var result : workers.invokeAll(calls)) assertThat(result.get()).isEqualTo("WAITING");
        }
        assertThat(redis.opsForZSet().zCard("session:male")).isEqualTo(1);
        assertThat(redis.hasKey("verify:" + users.getFirst() + ":request-" + users.getFirst())).isFalse();
    }

    @Test
    void concurrentSixPersonEntryAndPollingNeverRequeuesMatchedUsers() throws Exception {
        try (var workers = Executors.newFixedThreadPool(6)) {
            var calls = IntStream.range(0, 6).<Callable<String>>mapToObj(i -> () -> enter(i,
                    i < 3 ? GenderType.MALE : GenderType.FEMALE).getStatus()).toList();
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
    void cancelledRequestCannotEnterAgainWithoutNewVerification() {
        enter(0, GenderType.MALE);
        assertThat(sessions.removeFromQueue(users.getFirst(), GenderType.MALE)).isTrue();
        assertThat(enter(0, GenderType.MALE).getStatus()).isEqualTo("REJECTED");
        assertThat(redis.opsForZSet().score("session:male:lease", users.getFirst().toString())).isNull();
    }
}
