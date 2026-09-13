package com.ssafya701.roundy.measurement;

import ch.qos.logback.classic.Level;
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
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Bounded local synthetic load only: real current controller, service, Redis Lua and Redis.
 * JWT cryptography and DB reads are replaced with deterministic test identities. No HTTP, AI or media is involved.
 */
class CumulativeQueueLoadExperiment {
    private static final int USERS = Integer.parseInt(System.getenv().getOrDefault("ROUNDY_LOAD_USERS", "1200"));
    private static final int WORKERS = Integer.parseInt(System.getenv().getOrDefault("ROUNDY_LOAD_WORKERS", "64"));
    private static final long BASE_USER_ID = 70_000_000_000L;

    @Test
    void formsCompleteRoomsForBoundedSyntheticLoad() throws Exception {
        ((ch.qos.logback.classic.Logger) LoggerFactory.getLogger("ROOT")).setLevel(Level.ERROR);
        assertThat(USERS).isGreaterThanOrEqualTo(1_000);
        assertThat(USERS % 6).as("3 male and 3 female per room").isZero();
        assertThat(WORKERS).isBetween(1, USERS);

        int port = Integer.parseInt(Objects.requireNonNull(System.getenv("ROUNDY_TEST_REDIS_PORT")));
        Path output = Path.of(Objects.requireNonNull(System.getenv("ROUNDY_LOAD_OUTPUT")));
        Files.createDirectories(output.getParent());
        assertThat(Files.exists(output)).as("never overwrite a previous measurement").isFalse();

        var factory = new LettuceConnectionFactory("127.0.0.1", port);
        factory.afterPropertiesSet();
        var redis = new StringRedisTemplate(factory);
        try {
            assertThat(redis.keys("*")).as("dedicated Redis must start empty").isEmpty();
            var repository = mock(UserRepository.class);
            var jwt = mock(JwtTokenProvider.class);
            var verification = new VerificationService(redis, repository);
            ReflectionTestUtils.setField(verification, "ttlSeconds", 300);
            var service = new SessionService(redis, redis, new ObjectMapper());
            service.init();
            SessionController controller = instantiateController(service, jwt, repository);

            List<SyntheticUser> users = prepareUsers(repository, jwt, verification);
            CountDownLatch ready = new CountDownLatch(Math.min(WORKERS, USERS));
            CountDownLatch start = new CountDownLatch(1);
            List<RequestResult> results = invokeConcurrently(controller, users, ready, start);
            StateSnapshot state = inspectState(redis, users);

            Map<String, Object> report = report(results, state);
            Files.writeString(output, new ObjectMapper().writeValueAsString(report) + "\n",
                    StandardOpenOption.CREATE_NEW);

            assertThat(((Map<?, ?>) report.get("responses")).get("exceptions")).isEqualTo(0L);
            assertThat(state.rooms()).hasSize(USERS / 6);
            assertThat(state.incompleteRooms()).isZero();
            assertThat(state.duplicateMemberships()).isZero();
            assertThat(state.unassignedUsers()).isZero();
            assertThat(state.queuedUsers()).isZero();
        } finally {
            Set<String> keys = redis.keys("*");
            if (keys != null && !keys.isEmpty()) redis.delete(keys);
            factory.destroy();
        }
    }

    private SessionController instantiateController(SessionService service, JwtTokenProvider jwt,
                                                    UserRepository repository) throws Exception {
        for (var constructor : SessionController.class.getConstructors()) {
            Object[] arguments = Arrays.stream(constructor.getParameterTypes()).map(type -> {
                if (type == SessionService.class) return service;
                if (type == JwtTokenProvider.class) return jwt;
                if (type == UserRepository.class) return repository;
                throw new IllegalStateException("Unexpected controller dependency: " + type);
            }).toArray();
            return (SessionController) constructor.newInstance(arguments);
        }
        throw new IllegalStateException("No public SessionController constructor");
    }

    private List<SyntheticUser> prepareUsers(UserRepository repository, JwtTokenProvider jwt,
                                             VerificationService verification) {
        List<SyntheticUser> users = new ArrayList<>();
        for (int index = 0; index < USERS; index++) {
            long id = BASE_USER_ID + index;
            GenderType gender = index < USERS / 2 ? GenderType.MALE : GenderType.FEMALE;
            String requestId = "load-" + id;
            users.add(new SyntheticUser(id, gender, requestId));
            when(jwt.getUserId(Long.toString(id))).thenReturn(id);
            when(jwt.validateToken(Long.toString(id))).thenReturn(true);
            when(repository.findById(id)).thenReturn(java.util.Optional.of(User.builder()
                    .kakaoId(id).gender(gender).build()));
            verification.startVerification(id, requestId);
            verification.updateVerificationStatus(id, requestId, true);
        }
        return users;
    }

    private List<RequestResult> invokeConcurrently(SessionController controller, List<SyntheticUser> users,
                                                   CountDownLatch ready, CountDownLatch start) throws Exception {
        try (ExecutorService pool = Executors.newFixedThreadPool(WORKERS)) {
            List<Future<RequestResult>> futures = new ArrayList<>();
            for (SyntheticUser user : users) {
                futures.add(pool.submit((Callable<RequestResult>) () -> {
                    ready.countDown();
                    assertThat(start.await(20, TimeUnit.SECONDS)).as("initial worker wave starts together").isTrue();
                    long began = System.nanoTime();
                    try {
                        var response = controller.enterSession("Bearer " + user.id(), new SessionEnterRequest(user.requestId()));
                        SessionEnterResponse body = Objects.requireNonNull(Objects.requireNonNull(response.getBody()).getData());
                        return RequestResult.response(user.id(), System.nanoTime() - began, body.isSuccess(), body.getRoomId());
                    } catch (Throwable error) {
                        return RequestResult.failure(user.id(), System.nanoTime() - began, error.toString());
                    }
                }));
            }
            assertThat(ready.await(30, TimeUnit.SECONDS)).as("initial bounded worker wave is queued").isTrue();
            start.countDown();
            List<RequestResult> results = new ArrayList<>();
            for (Future<RequestResult> future : futures) results.add(future.get(90, TimeUnit.SECONDS));
            return results;
        }
    }

    private StateSnapshot inspectState(StringRedisTemplate redis, List<SyntheticUser> users) {
        Map<String, Set<String>> rooms = new HashMap<>();
        Map<String, Integer> memberships = new HashMap<>();
        int incomplete = 0;
        for (String key : Objects.requireNonNull(redis.keys("room:*:members"))) {
            Set<String> members = new TreeSet<>(Objects.requireNonNull(redis.opsForSet().members(key)));
            rooms.put(key, members);
            int males = 0;
            for (String id : members) {
                memberships.merge(id, 1, Integer::sum);
                String memberKey = key.substring(0, key.length() - "members".length()) + "member:" + id;
                if ("MALE".equals(redis.opsForHash().get(memberKey, "gender"))) males++;
            }
            if (members.size() != 6 || males != 3) incomplete++;
        }
        int unassigned = 0;
        int queued = 0;
        for (SyntheticUser user : users) {
            String id = Long.toString(user.id());
            if (redis.opsForValue().get("user:" + id + ":currentRoom") == null) unassigned++;
            String queue = user.gender() == GenderType.MALE ? "session:male" : "session:female";
            if (redis.opsForZSet().score(queue, id) != null) queued++;
        }
        int duplicates = (int) memberships.values().stream().filter(count -> count > 1).count();
        return new StateSnapshot(rooms, incomplete, duplicates, unassigned, queued);
    }

    private Map<String, Object> report(List<RequestResult> results, StateSnapshot state) {
        List<Long> durations = results.stream().map(RequestResult::durationNanos).sorted().toList();
        long matched = results.stream().filter(result -> result.roomId() != null).count();
        long waiting = results.stream().filter(result -> result.error() == null && result.roomId() == null && result.success()).count();
        long rejected = results.stream().filter(result -> result.error() == null && !result.success()).count();
        long exceptions = results.stream().filter(result -> result.error() != null).count();
        Map<String, Object> report = new LinkedHashMap<>();
        report.put("scope", "bounded local synthetic Controller + real Redis; no HTTP, DB, JWT crypto, AI or media");
        report.put("users", USERS);
        report.put("workers", WORKERS);
        report.put("requestStart", "initial worker wave starts on one latch; remaining requests are queued behind the bounded executor");
        report.put("responses", Map.of("matched", matched, "waiting", waiting, "businessRejected", rejected, "exceptions", exceptions));
        report.put("latencyMs", Map.of("p50", percentile(durations, 0.50), "p95", percentile(durations, 0.95), "p99", percentile(durations, 0.99), "max", durations.getLast() / 1_000_000.0));
        report.put("state", Map.of("rooms", state.rooms().size(), "incompleteRooms", state.incompleteRooms(), "duplicateMemberships", state.duplicateMemberships(), "unassignedUsers", state.unassignedUsers(), "queuedUsers", state.queuedUsers()));
        report.put("requests", results.stream().sorted(Comparator.comparingLong(RequestResult::userId)).map(RequestResult::asMap).toList());
        return report;
    }

    private double percentile(List<Long> values, double p) {
        return values.get((int) Math.ceil(values.size() * p) - 1) / 1_000_000.0;
    }

    private record SyntheticUser(long id, GenderType gender, String requestId) { }
    private record StateSnapshot(Map<String, Set<String>> rooms, int incompleteRooms, int duplicateMemberships,
                                 int unassignedUsers, int queuedUsers) { }
    private record RequestResult(long userId, long durationNanos, boolean success, String roomId, String error) {
        static RequestResult response(long userId, long durationNanos, boolean success, String roomId) {
            return new RequestResult(userId, durationNanos, success, roomId, null);
        }
        static RequestResult failure(long userId, long durationNanos, String error) {
            return new RequestResult(userId, durationNanos, false, null, error);
        }
        Map<String, Object> asMap() {
            return Map.of("user", userId, "durationNanos", durationNanos, "success", success, "roomId", roomId == null ? "" : roomId, "error", error == null ? "" : error);
        }
    }
}
