package com.ssafya701.roundy.webrtc.handler;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

@EnabledIfEnvironmentVariable(named = "ROUNDY_TEST_REDIS_PORT", matches = "\\d+")
class RedisMessageRateLimiterTest {

    private static LettuceConnectionFactory factory;
    private static StringRedisTemplate redis;

    @BeforeAll
    static void connect() {
        factory = new LettuceConnectionFactory(
                "127.0.0.1",
                Integer.parseInt(System.getenv("ROUNDY_TEST_REDIS_PORT"))
        );
        factory.afterPropertiesSet();
        redis = new StringRedisTemplate(factory);
    }

    @AfterAll
    static void disconnect() {
        factory.destroy();
    }

    @BeforeEach
    void clean() {
        redis.delete("roundy:webrtc:message-rate:v1:user:42");
    }

    @Test
    void twoApplicationInstancesShareOneAtomicUserLimit() {
        RedisMessageRateLimiter firstInstance = limiter(3, 10_000L);
        RedisMessageRateLimiter secondInstance = limiter(3, 10_000L);

        assertThat(firstInstance.allow("user:42")).isTrue();
        assertThat(secondInstance.allow("user:42")).isTrue();
        assertThat(firstInstance.allow("user:42")).isTrue();
        assertThat(secondInstance.allow("user:42")).isFalse();
        assertThat(redis.getExpire("roundy:webrtc:message-rate:v1:user:42")).isPositive();
    }

    @Test
    void concurrentBurstAcrossInstancesAllowsExactlyTheConfiguredCount() throws Exception {
        RedisMessageRateLimiter firstInstance = limiter(20, 10_000L);
        RedisMessageRateLimiter secondInstance = limiter(20, 10_000L);

        try (var executor = Executors.newFixedThreadPool(16)) {
            var requests = IntStream.range(0, 64)
                    .<Callable<Boolean>>mapToObj(index -> () ->
                            (index % 2 == 0 ? firstInstance : secondInstance).allow("user:42"))
                    .toList();

            long allowed = executor.invokeAll(requests).stream()
                    .filter(result -> {
                        try {
                            return result.get();
                        } catch (Exception exception) {
                            throw new IllegalStateException(exception);
                        }
                    })
                    .count();

            assertThat(allowed).isEqualTo(20);
        }
    }

    private RedisMessageRateLimiter limiter(int count, long windowMillis) {
        RedisMessageRateLimiter limiter = new RedisMessageRateLimiter(redis);
        ReflectionTestUtils.setField(limiter, "limit", count);
        ReflectionTestUtils.setField(limiter, "windowMillis", windowMillis);
        return limiter;
    }
}
