package com.ssafya701.roundy.webrtc.handler;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WebSocketMessageGuardTest {

    @Test
    void rejectsAnOversizedPayloadBeforeDeserialization() {
        WebSocketMessageGuard guard = new WebSocketMessageGuard(actorKey -> true);
        assertThat(guard.check("socket-1", WebSocketMessageGuard.MAX_PAYLOAD_CHARACTERS + 1))
                .isEqualTo(WebSocketMessageGuard.Decision.TOO_LARGE);
    }

    @Test
    void delegatesFrequencyDecisionToSharedLimiter() {
        WebSocketMessageGuard allowed = new WebSocketMessageGuard(actorKey -> true);
        WebSocketMessageGuard limited = new WebSocketMessageGuard(actorKey -> false);

        assertThat(allowed.check("user:7", 10)).isEqualTo(WebSocketMessageGuard.Decision.ALLOWED);
        assertThat(limited.check("user:7", 10)).isEqualTo(WebSocketMessageGuard.Decision.RATE_LIMITED);
    }
}
