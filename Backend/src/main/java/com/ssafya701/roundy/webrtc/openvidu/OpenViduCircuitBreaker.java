package com.ssafya701.roundy.webrtc.openvidu;

import com.ssafya701.roundy.config.OpenViduProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Objects;
import java.util.function.LongSupplier;
import java.util.function.Supplier;

/**
 * OpenVidu 장애가 실시간 요청 처리 경로로 연쇄 확산되는 것을 막는 작은 회로 차단기.
 *
 * <p>OPEN 대기 시간이 지나면 단 하나의 HALF_OPEN 복구 요청만 허용한다. 이전 세대에서
 * 늦게 끝난 요청은 현재 상태를 바꾸지 못하도록 permit에 세대 번호를 기록한다.</p>
 */
@Slf4j
@Component
public class OpenViduCircuitBreaker {

    private final int failureThreshold;
    private final long openDurationNanos;
    private final LongSupplier nanoTime;

    private State state = State.CLOSED;
    private int consecutiveFailures;
    private long openedAtNanos;
    private long generation;

    @Autowired
    public OpenViduCircuitBreaker(OpenViduProperties properties) {
        this(
                properties.getCircuitFailureThreshold(),
                properties.getCircuitOpenDuration(),
                System::nanoTime
        );
    }

    OpenViduCircuitBreaker(int failureThreshold, Duration openDuration, LongSupplier nanoTime) {
        if (failureThreshold < 1) {
            throw new IllegalArgumentException("circuitFailureThreshold must be at least 1");
        }
        Objects.requireNonNull(openDuration, "circuitOpenDuration must not be null");
        if (openDuration.isZero() || openDuration.isNegative()) {
            throw new IllegalArgumentException("circuitOpenDuration must be positive");
        }

        this.failureThreshold = failureThreshold;
        this.openDurationNanos = openDuration.toNanos();
        this.nanoTime = Objects.requireNonNull(nanoTime, "nanoTime must not be null");
    }

    public <T> T execute(Supplier<T> operation) {
        Permit permit = acquirePermit();

        try {
            T result = operation.get();
            recordSuccess(permit);
            return result;
        } catch (RuntimeException exception) {
            recordFailure(permit);
            throw exception;
        }
    }

    private synchronized Permit acquirePermit() {
        if (state == State.CLOSED) {
            return new Permit(generation, false);
        }

        long now = nanoTime.getAsLong();
        if (state == State.OPEN && hasOpenDurationElapsed(now)) {
            state = State.HALF_OPEN;
            log.info("OpenVidu circuit entered HALF_OPEN state");
            return new Permit(generation, true);
        }

        throw new CircuitOpenException(retryAfterMillis(now));
    }

    private synchronized void recordSuccess(Permit permit) {
        if (permit.generation() != generation) {
            return;
        }

        if (permit.recoveryProbe() && state == State.HALF_OPEN) {
            state = State.CLOSED;
            consecutiveFailures = 0;
            generation++;
            log.info("OpenVidu circuit recovered and entered CLOSED state");
        } else if (!permit.recoveryProbe() && state == State.CLOSED) {
            consecutiveFailures = 0;
        }
    }

    private synchronized void recordFailure(Permit permit) {
        if (permit.generation() != generation) {
            return;
        }

        if (permit.recoveryProbe() && state == State.HALF_OPEN) {
            openCircuit();
            return;
        }

        if (state == State.CLOSED && ++consecutiveFailures >= failureThreshold) {
            openCircuit();
        }
    }

    private void openCircuit() {
        state = State.OPEN;
        openedAtNanos = nanoTime.getAsLong();
        generation++;
        log.warn("OpenVidu circuit entered OPEN state after consecutive failures");
    }

    private boolean hasOpenDurationElapsed(long now) {
        return now - openedAtNanos >= openDurationNanos;
    }

    private long retryAfterMillis(long now) {
        if (state != State.OPEN) {
            return Math.max(1L, Duration.ofNanos(openDurationNanos).toMillis());
        }

        long remainingNanos = Math.max(0L, openDurationNanos - (now - openedAtNanos));
        return Math.max(1L, (remainingNanos + 999_999L) / 1_000_000L);
    }

    synchronized Status status() {
        return new Status(state, consecutiveFailures, retryAfterMillis(nanoTime.getAsLong()));
    }

    enum State {
        CLOSED,
        OPEN,
        HALF_OPEN
    }

    record Status(State state, int consecutiveFailures, long retryAfterMillis) {
    }

    private record Permit(long generation, boolean recoveryProbe) {
    }

    public static class CircuitOpenException extends RuntimeException {
        private final long retryAfterMillis;

        CircuitOpenException(long retryAfterMillis) {
            super("OpenVidu circuit is open; retry after " + retryAfterMillis + "ms");
            this.retryAfterMillis = retryAfterMillis;
        }

        public long getRetryAfterMillis() {
            return retryAfterMillis;
        }
    }
}
