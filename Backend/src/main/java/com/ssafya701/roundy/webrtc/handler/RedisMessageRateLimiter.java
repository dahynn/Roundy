package com.ssafya701.roundy.webrtc.handler;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 모든 애플리케이션 인스턴스가 같은 Redis 카운터를 사용해 사용자별 메시지 빈도를 제한한다.
 * Redis 장애 시에는 연결 전체를 끊지 않고 인스턴스 로컬 제한으로 축소 운영한다.
 */
@Slf4j
@Component
public class RedisMessageRateLimiter implements MessageRateLimiter {

    private static final String KEY_PREFIX = "roundy:webrtc:message-rate:v1:";
    private static final int MAX_FALLBACK_ACTORS = 10_000;
    private static final long FALLBACK_LOG_INTERVAL_MILLIS = 60_000L;
    private static final DefaultRedisScript<Long> INCREMENT_SCRIPT = new DefaultRedisScript<>("""
            local count = redis.call('INCR', KEYS[1])
            if count == 1 then
              redis.call('PEXPIRE', KEYS[1], ARGV[1])
            end
            return count
            """, Long.class);

    private final StringRedisTemplate redisTemplate;
    private final Map<String, Deque<Long>> fallbackWindows = new ConcurrentHashMap<>();
    private final AtomicLong nextFallbackLogAt = new AtomicLong();

    @Value("${webrtc.message-rate-limit.count:20}")
    private int limit;

    @Value("${webrtc.message-rate-limit.window-millis:10000}")
    private long windowMillis;

    public RedisMessageRateLimiter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public boolean allow(String actorKey) {
        try {
            Long count = redisTemplate.execute(
                    INCREMENT_SCRIPT,
                    List.of(KEY_PREFIX + actorKey),
                    String.valueOf(windowMillis)
            );
            if (count == null) {
                throw new IllegalStateException("Redis rate-limit script returned null");
            }
            fallbackWindows.remove(actorKey);
            return count <= limit;
        } catch (RuntimeException exception) {
            long now = System.currentTimeMillis();
            logFallbackOncePerInterval(now);
            return allowLocally(actorKey, now);
        }
    }

    private boolean allowLocally(String actorKey, long now) {
        Deque<Long> receivedAt;
        synchronized (fallbackWindows) {
            receivedAt = fallbackWindows.get(actorKey);
            if (receivedAt == null) {
                if (fallbackWindows.size() >= MAX_FALLBACK_ACTORS) {
                    return false;
                }
                receivedAt = new ArrayDeque<>();
                fallbackWindows.put(actorKey, receivedAt);
            }
        }
        synchronized (receivedAt) {
            while (!receivedAt.isEmpty() && now - receivedAt.peekFirst() >= windowMillis) {
                receivedAt.removeFirst();
            }
            if (receivedAt.size() >= limit) {
                return false;
            }
            receivedAt.addLast(now);
            return true;
        }
    }

    private void logFallbackOncePerInterval(long now) {
        long nextLogAt = nextFallbackLogAt.get();
        if (now >= nextLogAt && nextFallbackLogAt.compareAndSet(nextLogAt, now + FALLBACK_LOG_INTERVAL_MILLIS)) {
            log.warn("WebSocket global rate limiter unavailable; using bounded local fallback");
        }
    }
}
