package com.ssafya701.roundy.webrtc.handler;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WebSocketMessageGuardTest {

    private final WebSocketMessageGuard guard = new WebSocketMessageGuard();

    @Test
    void rejectsAnOversizedPayloadBeforeDeserialization() {
        assertThat(guard.check("socket-1", WebSocketMessageGuard.MAX_PAYLOAD_CHARACTERS + 1))
                .isEqualTo(WebSocketMessageGuard.Decision.TOO_LARGE);
    }

    @Test
    void limitsRapidMessagesPerSocketAndClearsOnDisconnect() {
        for (int count = 0; count < WebSocketMessageGuard.MAX_MESSAGES_PER_WINDOW; count++) {
            assertThat(guard.check("socket-1", 10)).isEqualTo(WebSocketMessageGuard.Decision.ALLOWED);
        }
        assertThat(guard.check("socket-1", 10)).isEqualTo(WebSocketMessageGuard.Decision.RATE_LIMITED);

        guard.clear("socket-1");
        assertThat(guard.check("socket-1", 10)).isEqualTo(WebSocketMessageGuard.Decision.ALLOWED);
    }
}
