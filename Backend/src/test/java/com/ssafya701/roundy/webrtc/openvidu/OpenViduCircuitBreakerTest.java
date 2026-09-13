package com.ssafya701.roundy.webrtc.openvidu;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OpenViduCircuitBreakerTest {

    @Test
    void opensAfterThresholdAndRejectsWithoutCallingOpenViduAgain() {
        AtomicLong clock = new AtomicLong();
        AtomicInteger calls = new AtomicInteger();
        OpenViduCircuitBreaker breaker = new OpenViduCircuitBreaker(
                2, Duration.ofSeconds(30), clock::get);

        assertThatThrownBy(() -> breaker.execute(() -> failingCall(calls)))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> breaker.execute(() -> failingCall(calls)))
                .isInstanceOf(IllegalStateException.class);

        assertThatThrownBy(() -> breaker.execute(() -> successfulCall(calls)))
                .isInstanceOf(OpenViduCircuitBreaker.CircuitOpenException.class)
                .satisfies(exception -> assertThat(
                        ((OpenViduCircuitBreaker.CircuitOpenException) exception).getRetryAfterMillis())
                        .isEqualTo(30_000L));
        assertThat(calls).hasValue(2);
        assertThat(breaker.status().state()).isEqualTo(OpenViduCircuitBreaker.State.OPEN);
    }

    @Test
    void successfulRecoveryProbeClosesCircuit() {
        AtomicLong clock = new AtomicLong();
        AtomicInteger calls = new AtomicInteger();
        OpenViduCircuitBreaker breaker = new OpenViduCircuitBreaker(
                1, Duration.ofSeconds(30), clock::get);

        assertThatThrownBy(() -> breaker.execute(() -> failingCall(calls)))
                .isInstanceOf(IllegalStateException.class);
        clock.addAndGet(Duration.ofSeconds(30).toNanos());

        assertThat(breaker.execute(() -> successfulCall(calls))).isEqualTo("ok");
        assertThat(breaker.execute(() -> successfulCall(calls))).isEqualTo("ok");
        assertThat(calls).hasValue(3);
        assertThat(breaker.status().state()).isEqualTo(OpenViduCircuitBreaker.State.CLOSED);
        assertThat(breaker.status().consecutiveFailures()).isZero();
    }

    @Test
    void failedRecoveryProbeReopensForAFullCooldown() {
        AtomicLong clock = new AtomicLong();
        AtomicInteger calls = new AtomicInteger();
        OpenViduCircuitBreaker breaker = new OpenViduCircuitBreaker(
                1, Duration.ofSeconds(30), clock::get);

        assertThatThrownBy(() -> breaker.execute(() -> failingCall(calls)))
                .isInstanceOf(IllegalStateException.class);
        clock.addAndGet(Duration.ofSeconds(30).toNanos());
        assertThatThrownBy(() -> breaker.execute(() -> failingCall(calls)))
                .isInstanceOf(IllegalStateException.class);

        clock.addAndGet(Duration.ofSeconds(29).toNanos());
        assertThatThrownBy(() -> breaker.execute(() -> successfulCall(calls)))
                .isInstanceOf(OpenViduCircuitBreaker.CircuitOpenException.class);
        assertThat(calls).hasValue(2);
        assertThat(breaker.status().retryAfterMillis()).isEqualTo(1_000L);
    }

    private String failingCall(AtomicInteger calls) {
        calls.incrementAndGet();
        throw new IllegalStateException("OpenVidu unavailable");
    }

    private String successfulCall(AtomicInteger calls) {
        calls.incrementAndGet();
        return "ok";
    }
}
