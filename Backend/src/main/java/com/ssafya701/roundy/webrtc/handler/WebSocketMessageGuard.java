package com.ssafya701.roundy.webrtc.handler;

import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket 텍스트 입력을 역직렬화 전에 제한한다.
 * 단일 애플리케이션 인스턴스의 최소 방어이며, 전역 제한은 별도 운영 구성에서 다룬다.
 */
@Component
public class WebSocketMessageGuard {

    static final int MAX_PAYLOAD_CHARACTERS = 4 * 1024;
    static final int MAX_MESSAGES_PER_WINDOW = 20;
    static final long WINDOW_MILLIS = 10_000L;

    private final Map<String, Deque<Long>> receivedAtBySession = new ConcurrentHashMap<>();

    public Decision check(String sessionId, int payloadCharacters) {
        if (payloadCharacters > MAX_PAYLOAD_CHARACTERS) {
            return Decision.TOO_LARGE;
        }

        long now = System.currentTimeMillis();
        Deque<Long> receivedAt = receivedAtBySession.computeIfAbsent(sessionId, ignored -> new ArrayDeque<>());
        synchronized (receivedAt) {
            while (!receivedAt.isEmpty() && now - receivedAt.peekFirst() >= WINDOW_MILLIS) {
                receivedAt.removeFirst();
            }
            if (receivedAt.size() >= MAX_MESSAGES_PER_WINDOW) {
                return Decision.RATE_LIMITED;
            }
            receivedAt.addLast(now);
            return Decision.ALLOWED;
        }
    }

    public void clear(String sessionId) {
        receivedAtBySession.remove(sessionId);
    }

    public enum Decision {
        ALLOWED,
        TOO_LARGE,
        RATE_LIMITED
    }
}
