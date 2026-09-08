package com.ssafya701.roundy.measurement;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafya701.roundy.auth.entity.User;
import com.ssafya701.roundy.auth.enums.GenderType;
import com.ssafya701.roundy.auth.repository.UserRepository;
import com.ssafya701.roundy.global.jwt.JwtTokenProvider;
import com.ssafya701.roundy.session.controller.SessionController;
import com.ssafya701.roundy.session.dto.request.SessionEnterRequest;
import com.ssafya701.roundy.session.dto.response.SessionEnterResponse;
import com.ssafya701.roundy.session.service.SessionService;
import com.ssafya701.roundy.verification.service.VerificationService;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.slf4j.LoggerFactory;
import ch.qos.logback.classic.Level;

import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/** Actual historical controllers/services/Lua, with only identity/DB/AI completion substituted. */
class QueueConcurrencyExperiment {
    private final ObjectMapper json = new ObjectMapper();
    private final ThreadLocal<Boolean> delayEntry = ThreadLocal.withInitial(() -> false);
    private final Queue<Map<String, Object>> requests = new ConcurrentLinkedQueue<>();
    private final AtomicLong sequence = new AtomicLong();
    private CountDownLatch paused;
    private CountDownLatch resume;
    private StringRedisTemplate redis;
    private SessionService service;
    private SessionController controller;
    private VerificationService verification;
    private final List<Long> users = new ArrayList<>();
    private final String version = System.getenv("ROUNDY_CONCURRENCY_VERSION");
    private final Path output = Path.of(System.getenv("ROUNDY_CONCURRENCY_OUTPUT"));

    private void setup(long base) throws Exception {
        assertThat(redis.keys("*")).as("dedicated Redis must be empty between trials").isEmpty();
        users.clear();
        requests.clear();
        sequence.set(0);
        paused = new CountDownLatch(1);
        resume = new CountDownLatch(1);
        var repository = mock(UserRepository.class);
        var jwt = mock(JwtTokenProvider.class);
        verification = new VerificationService(redis, repository);
        ReflectionTestUtils.setField(verification, "ttlSeconds", 300);
        SessionService real = new SessionService(redis, redis, json);
        real.init();
        service = mock(SessionService.class, withSettings().spiedInstance(real).defaultAnswer(invocation -> {
            if (invocation.getMethod().getName().equals("addToQueueAndMatch") && delayEntry.get()) {
                paused.countDown();
                if (!resume.await(10, TimeUnit.SECONDS)) throw new TimeoutException("entry resume");
            }
            return invocation.callRealMethod();
        }));
        // The old controller consumes verification itself; the fixed one delegates it to Lua.
        for (var constructor : SessionController.class.getConstructors()) {
            Object[] args = Arrays.stream(constructor.getParameterTypes()).map(type -> {
                if (type == SessionService.class) return service;
                if (type == VerificationService.class) return verification;
                if (type == JwtTokenProvider.class) return jwt;
                if (type == UserRepository.class) return repository;
                throw new IllegalStateException("Unknown constructor dependency: " + type);
            }).toArray();
            controller = (SessionController) constructor.newInstance(args);
        }
        assertThat(controller).isNotNull();
        for (int i = 0; i < 6; i++) {
            long id = base + i;
            users.add(id);
            when(jwt.getUserId(Long.toString(id))).thenReturn(id);
            when(jwt.validateToken(Long.toString(id))).thenReturn(true);
            when(repository.findById(id)).thenReturn(Optional.of(User.builder()
                    .kakaoId(id).gender(i < 3 ? GenderType.MALE : GenderType.FEMALE).build()));
            verification.startVerification(id, "synthetic-" + id);
            verification.updateVerificationStatus(id, "synthetic-" + id, true);
        }
    }

    private SessionEnterResponse enter(int index) {
        long id = users.get(index);
        long order = sequence.getAndIncrement();
        long start = System.nanoTime();
        Map<String, Object> record = new LinkedHashMap<>();
        record.put("call", order);
        record.put("user", id);
        record.put("controlledDelay", delayEntry.get());
        try {
            var response = controller.enterSession("Bearer " + id,
                    new SessionEnterRequest("synthetic-" + id));
            var data = Objects.requireNonNull(response.getBody()).getData();
            record.put("httpStatusFromController", response.getStatusCode().value());
            record.put("success", data.isSuccess());
            record.put("roomId", data.getRoomId());
            return data;
        } catch (RuntimeException | Error error) {
            record.put("exception", error.toString());
            throw error;
        } finally {
            record.put("durationNanos", System.nanoTime() - start);
            requests.add(record);
        }
    }

    private void concurrentEntries(int count, boolean sameUser) throws Exception {
        var start = new CyclicBarrier(count);
        try (var pool = Executors.newFixedThreadPool(count)) {
            List<Future<SessionEnterResponse>> futures = new ArrayList<>();
            for (int i = 0; i < count; i++) {
                final int index = sameUser ? 0 : i % 6;
                futures.add(pool.submit(() -> {
                    start.await(10, TimeUnit.SECONDS);
                    return enter(index);
                }));
            }
            for (var future : futures) future.get(15, TimeUnit.SECONDS);
        }
    }

    private Map<String, Object> state() {
        Map<String, Object> result = new LinkedHashMap<>();
        Map<String, Set<String>> rooms = new TreeMap<>();
        Map<String, String> assignments = new TreeMap<>();
        Map<String, Integer> memberships = new TreeMap<>();
        int capacityViolations = 0;
        for (String key : Objects.requireNonNull(redis.keys("room:*:members"))) {
            Set<String> members = Objects.requireNonNull(redis.opsForSet().members(key));
            rooms.put(key, new TreeSet<>(members));
            int males = 0;
            for (String id : members) {
                memberships.merge(id, 1, Integer::sum);
                String memberKey = key.substring(0, key.length() - "members".length()) + "member:" + id;
                if ("MALE".equals(redis.opsForHash().get(memberKey, "gender"))) males++;
            }
            if (members.size() != 6 || males != 3) capacityViolations++;
        }
        int matchedInQueue = 0;
        for (int i = 0; i < users.size(); i++) {
            Long id = users.get(i);
            String room = service.getUserCurrentRoom(id);
            if (room != null) {
                assignments.put(id.toString(), room);
                if (service.isInQueue(id, i < 3 ? GenderType.MALE : GenderType.FEMALE)) matchedInQueue++;
            }
        }
        result.put("rooms", rooms);
        result.put("assignments", assignments);
        result.put("matchedUsersInQueue", matchedInQueue);
        result.put("usersInMultipleRooms", memberships.values().stream().filter(n -> n > 1).count());
        result.put("capacityViolations", capacityViolations);
        result.put("maleQueue", redis.opsForZSet().range("session:male", 0, -1));
        result.put("femaleQueue", redis.opsForZSet().range("session:female", 0, -1));
        return result;
    }

    private void delayedPoll() throws Exception {
        for (int i = 0; i < 5; i++) assertThat(enter(i).isSuccess()).isTrue();
        try (var pool = Executors.newSingleThreadExecutor()) {
            var poll = pool.submit(() -> {
                delayEntry.set(true);
                try { return enter(0); } finally { delayEntry.remove(); }
            });
            try {
                assertThat(paused.await(10, TimeUnit.SECONDS)).as("poll reached real service boundary").isTrue();
                assertThat(enter(5).getRoomId()).isNotNull();
            } finally {
                resume.countDown();
            }
            poll.get(15, TimeUnit.SECONDS);
        }
    }

    private boolean staleCleanup() {
        String id = users.getFirst().toString();
        String oldRoom = "old-" + id;
        String newRoom = "new-" + id;
        // Controlled stale ownership state, separate from the queue competition scenario.
        redis.opsForSet().add("room:" + oldRoom + ":members", id);
        redis.opsForHash().put("room:" + oldRoom + ":member:" + id, "gender", "MALE");
        redis.opsForValue().set("user:" + id + ":currentRoom", newRoom);
        service.cleanupRoom(oldRoom);
        return !newRoom.equals(service.getUserCurrentRoom(users.getFirst()));
    }

    @Test
    void compareControlledSchedules() throws Exception {
        ((ch.qos.logback.classic.Logger) LoggerFactory.getLogger("ROOT")).setLevel(Level.ERROR);
        int repetitions = Integer.parseInt(System.getenv().getOrDefault("ROUNDY_CONCURRENCY_REPEATS", "100"));
        if (repetitions < 1 || repetitions > 1000) throw new IllegalArgumentException("repetitions 1..1000");
        var factory = new LettuceConnectionFactory("127.0.0.1",
                Integer.parseInt(System.getenv("ROUNDY_TEST_REDIS_PORT")));
        factory.afterPropertiesSet();
        redis = new StringRedisTemplate(factory);
        int totalViolations = 0;
        try {
            for (String scenario : List.of("delayed-poll-after-match", "six-entry-and-poll",
                    "duplicate-first-entry", "stale-room-cleanup")) {
                for (int iteration = -3; iteration < repetitions; iteration++) {
                    Map<String, Object> record = new LinkedHashMap<>();
                    record.put("version", version);
                    record.put("scenario", scenario);
                    record.put("iteration", iteration);
                    record.put("warmup", iteration < 0);
                    record.put("schedule", scenario.equals("delayed-poll-after-match")
                            ? "queue5,pause-user0-at-service,enter-user5,release-user0"
                            : scenario.equals("stale-room-cleanup") ? "old-member,new-assignment,cleanup-old"
                            : "cyclic-barrier;OS-order-recorded-in-calls");
                    record.put("dataset", "fixed sequential synthetic IDs; no random seed");
                    long base = 20_000_000_000L + (iteration + 3) * 10L;
                    // Refuse an occupied DB BEFORE entering the cleanup block.
                    assertThat(redis.keys("*")).as("dedicated Redis must be empty").isEmpty();
                    try {
                        setup(base);
                        boolean lostAssignment = false;
                        if (scenario.equals("delayed-poll-after-match")) delayedPoll();
                        if (scenario.equals("six-entry-and-poll")) {
                            concurrentEntries(6, false);
                            concurrentEntries(16, false);
                        }
                        if (scenario.equals("duplicate-first-entry")) concurrentEntries(16, true);
                        if (scenario.equals("stale-room-cleanup")) lostAssignment = staleCleanup();
                        Map<String, Object> snapshot = state();
                        boolean violated = lostAssignment
                                || ((Number) snapshot.get("matchedUsersInQueue")).intValue() > 0
                                || ((Number) snapshot.get("usersInMultipleRooms")).intValue() > 0
                                || ((Number) snapshot.get("capacityViolations")).intValue() > 0;
                        record.put("state", snapshot);
                        record.put("lostNewRoomAssignment", lostAssignment);
                        record.put("invariantViolation", violated);
                        if (violated && iteration >= 0) totalViolations++;
                        if (scenario.equals("six-entry-and-poll"))
                            assertThat(((Map<?, ?>) snapshot.get("rooms")).size()).isEqualTo(1);
                        if (scenario.equals("duplicate-first-entry")) {
                            assertThat(redis.opsForZSet().zCard("session:male")).isEqualTo(1);
                            assertThat(redis.hasKey("verify:" + base + ":synthetic-" + base)).isFalse();
                        }
                    } catch (Exception | AssertionError error) {
                        record.put("harnessError", error.toString());
                        throw error;
                    } finally {
                        resume.countDown();
                        record.put("requests", new ArrayList<>(requests));
                        Files.writeString(output, json.writeValueAsString(record) + "\n",
                                StandardOpenOption.CREATE, StandardOpenOption.APPEND);
                        // This process owns the dedicated instance; never connect it to a shared Redis.
                        Set<String> keys = redis.keys("*");
                        if (keys != null && !keys.isEmpty()) redis.delete(keys);
                    }
                }
            }
            if ("candidate".equals(version)) assertThat(totalViolations).isZero();
        } finally {
            factory.destroy();
        }
    }
}
