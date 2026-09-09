package com.ssafya701.roundy.chatmessage.service;

import com.ssafya701.roundy.global.error.BusinessLogicException;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 쪽지 입력의 최소 길이·빈도 제한이다.
 * 여러 인스턴스에 걸친 제한은 배포 시 공유 저장소 기반으로 확장해야 한다.
 */
@Component
public class ChatMessageAbuseGuard {

    static final int MAX_CONTENT_LENGTH = 1_000;
    static final int MAX_MESSAGES_PER_WINDOW = 5;
    static final long WINDOW_MILLIS = 10_000L;

    private final Map<Long, Deque<Long>> sentAtByUser = new ConcurrentHashMap<>();

    public void validateAndRecord(Long userId, String content) {
        if (content == null || content.isBlank() || content.length() > MAX_CONTENT_LENGTH) {
            throw new BusinessLogicException("쪽지는 공백을 제외하고 1~1,000자까지 입력할 수 있습니다.");
        }

        long now = System.currentTimeMillis();
        Deque<Long> sentAt = sentAtByUser.computeIfAbsent(userId, ignored -> new ArrayDeque<>());
        synchronized (sentAt) {
            while (!sentAt.isEmpty() && now - sentAt.peekFirst() >= WINDOW_MILLIS) {
                sentAt.removeFirst();
            }
            if (sentAt.size() >= MAX_MESSAGES_PER_WINDOW) {
                throw new BusinessLogicException("쪽지는 잠시 후 다시 보낼 수 있습니다.");
            }
            sentAt.addLast(now);
        }
    }
}
