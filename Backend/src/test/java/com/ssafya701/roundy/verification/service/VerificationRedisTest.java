package com.ssafya701.roundy.verification.service;

import com.ssafya701.roundy.auth.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/** 실제 Redis에서 스크립트의 원자성과 인증 결과 소유권을 검증한다. */
@EnabledIfEnvironmentVariable(named = "ROUNDY_TEST_REDIS_PORT", matches = "\\d+")
class VerificationRedisTest {
    private static LettuceConnectionFactory factory;
    private static StringRedisTemplate redis;
    private VerificationService service;
    private String requestId;

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
        service = new VerificationService(redis, mock(UserRepository.class));
        ReflectionTestUtils.setField(service, "ttlSeconds", 30);
        requestId = "test-" + UUID.randomUUID();
    }

    @AfterEach
    void cleanUp() { redis.delete("verify:7:" + requestId); }

    @Test
    void anotherUserCannotConsumeSuccessfulVerification() {
        service.startVerification(7L, requestId);
        service.updateVerificationStatus(7L, requestId, true);
        assertThat(service.verifyAndDelete(8L, requestId)).isFalse();
        assertThat(service.verifyAndDelete(7L, requestId)).isTrue();
        assertThat(service.verifyAndDelete(7L, requestId)).isFalse();
    }

    @Test
    void prematureEntryDoesNotDeletePendingVerification() {
        service.startVerification(7L, requestId);
        assertThat(service.verifyAndDelete(7L, requestId)).isFalse();
        service.updateVerificationStatus(7L, requestId, true);
        assertThat(service.verifyAndDelete(7L, requestId)).isTrue();
    }

    @Test
    void lateResultsCannotResurrectAConsumedOrExpiredVerification() {
        service.startVerification(7L, requestId);
        service.updateVerificationStatus(7L, requestId, true);
        assertThat(service.verifyAndDelete(7L, requestId)).isTrue();
        service.updateVerificationStatus(7L, requestId, true);
        assertThat(service.verifyAndDelete(7L, requestId)).isFalse();
        assertThat(redis.hasKey("verify:7:" + requestId)).isFalse();
    }

    @Test
    void firstCompletionWinsAndFailedVerificationCannotBeConsumed() {
        service.startVerification(7L, requestId);
        service.updateVerificationStatus(7L, requestId, false);
        service.updateVerificationStatus(7L, requestId, true);
        assertThat(service.checkVerificationStatus(7L, requestId)).isEqualTo("FAILED");
        assertThat(service.verifyAndDelete(7L, requestId)).isFalse();
    }

    @Test
    void concurrentConsumersCanOnlySucceedOnce() throws Exception {
        service.startVerification(7L, requestId);
        service.updateVerificationStatus(7L, requestId, true);
        try (var executor = Executors.newFixedThreadPool(8)) {
            var calls = IntStream.range(0, 16)
                    .<Callable<Boolean>>mapToObj(i -> () -> service.verifyAndDelete(7L, requestId)).toList();
            int successes = 0;
            for (var result : executor.invokeAll(calls)) if (result.get()) successes++;
            assertThat(successes).isEqualTo(1);
        }
    }

    @Test
    void statusUpdatesKeepAnExpiry() {
        service.startVerification(7L, requestId);
        service.updateVerificationStatus(7L, requestId, true);
        assertThat(redis.getExpire("verify:7:" + requestId)).isBetween(1L, 30L);
    }
}
