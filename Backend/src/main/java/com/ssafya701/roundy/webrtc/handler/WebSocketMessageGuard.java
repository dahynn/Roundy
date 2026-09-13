package com.ssafya701.roundy.webrtc.handler;

import org.springframework.stereotype.Component;

/**
 * WebSocket 텍스트 입력을 역직렬화 전에 제한한다.
 * 빈도 제한은 Redis 기반 구현에 위임해 다중 애플리케이션 인스턴스에서 공유한다.
 */
@Component
public class WebSocketMessageGuard {

    static final int MAX_PAYLOAD_CHARACTERS = 4 * 1024;

    private final MessageRateLimiter rateLimiter;

    public WebSocketMessageGuard(MessageRateLimiter rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    public Decision check(String actorKey, int payloadCharacters) {
        if (payloadCharacters > MAX_PAYLOAD_CHARACTERS) {
            return Decision.TOO_LARGE;
        }
        return rateLimiter.allow(actorKey) ? Decision.ALLOWED : Decision.RATE_LIMITED;
    }

    public enum Decision {
        ALLOWED,
        TOO_LARGE,
        RATE_LIMITED
    }
}
