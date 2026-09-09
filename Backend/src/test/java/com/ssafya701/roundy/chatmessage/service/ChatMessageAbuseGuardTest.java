package com.ssafya701.roundy.chatmessage.service;

import com.ssafya701.roundy.global.error.BusinessLogicException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ChatMessageAbuseGuardTest {

    private final ChatMessageAbuseGuard guard = new ChatMessageAbuseGuard();

    @Test
    void rejectsBlankAndOversizedContent() {
        assertThatThrownBy(() -> guard.validateAndRecord(1L, "   "))
                .isInstanceOf(BusinessLogicException.class);
        assertThatThrownBy(() -> guard.validateAndRecord(1L, "a".repeat(ChatMessageAbuseGuard.MAX_CONTENT_LENGTH + 1)))
                .isInstanceOf(BusinessLogicException.class);
    }

    @Test
    void limitsRapidMessagesPerUser() {
        for (int count = 0; count < ChatMessageAbuseGuard.MAX_MESSAGES_PER_WINDOW; count++) {
            guard.validateAndRecord(1L, "안녕하세요");
        }

        assertThatThrownBy(() -> guard.validateAndRecord(1L, "한 번 더"))
                .isInstanceOf(BusinessLogicException.class);
    }
}
