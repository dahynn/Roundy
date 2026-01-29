package com.ssafya701.roundy.webrtc.logging;

import com.ssafya701.roundy.webrtc.room.ParticipantState;
import com.ssafya701.roundy.webrtc.room.RoomState;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * WebRTC 이벤트 로깅 모듈
 * 모든 WebRTC 관련 이벤트를 구조화하여 로깅
 */
@Slf4j
@Component
public class WebRtcEventLogger {

    private static final DateTimeFormatter TIMESTAMP_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");
    
    // 이벤트 카운터
    private final AtomicLong eventCounter = new AtomicLong(0);
    
    // 방별 이벤트 카운터
    private final Map<String, AtomicLong> roomEventCounters = new ConcurrentHashMap<>();

    /**
     * WebSocket 연결 성공 로깅
     */
    public void logConnectionEstablished(String sessionId, Long userId, String username) {
        long eventId = eventCounter.incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        log.info("[EVENT#{}] [{}] [CONNECTION_ESTABLISHED] sessionId={}, userId={}, username={}", 
                eventId, timestamp, sessionId, userId, username);
    }

    /**
     * WebSocket 연결 종료 로깅
     */
    public void logConnectionClosed(String sessionId, Long userId, String reason) {
        long eventId = eventCounter.incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        log.info("[EVENT#{}] [{}] [CONNECTION_CLOSED] sessionId={}, userId={}, reason={}", 
                eventId, timestamp, sessionId, userId, reason);
    }

    /**
     * 방 참가 로깅
     */
    public void logRoomJoined(String roomId, Long userId, String username, int participantCount) {
        long eventId = eventCounter.incrementAndGet();
        long roomEventId = roomEventCounters.computeIfAbsent(roomId, k -> new AtomicLong(0)).incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        log.info("[EVENT#{}] [{}] [ROOM_JOINED] roomId={}, roomEventId={}, userId={}, username={}, participantCount={}", 
                eventId, timestamp, roomId, roomEventId, userId, username, participantCount);
    }

    /**
     * 방 퇴장 로깅
     */
    public void logRoomLeft(String roomId, Long userId, int remainingParticipants) {
        long eventId = eventCounter.incrementAndGet();
        long roomEventId = roomEventCounters.computeIfAbsent(roomId, k -> new AtomicLong(0)).incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        log.info("[EVENT#{}] [{}] [ROOM_LEFT] roomId={}, roomEventId={}, userId={}, remainingParticipants={}", 
                eventId, timestamp, roomId, roomEventId, userId, remainingParticipants);
    }

    /**
     * 방 생성 로깅
     */
    public void logRoomCreated(String roomId, String mode, String openViduSessionId) {
        long eventId = eventCounter.incrementAndGet();
        long roomEventId = roomEventCounters.computeIfAbsent(roomId, k -> new AtomicLong(0)).incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        log.info("[EVENT#{}] [{}] [ROOM_CREATED] roomId={}, roomEventId={}, mode={}, openViduSessionId={}", 
                eventId, timestamp, roomId, roomEventId, mode, openViduSessionId);
    }

    /**
     * 방 삭제 로깅
     */
    public void logRoomDeleted(String roomId) {
        long eventId = eventCounter.incrementAndGet();
        long roomEventId = roomEventCounters.getOrDefault(roomId, new AtomicLong(0)).get();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        log.info("[EVENT#{}] [{}] [ROOM_DELETED] roomId={}, totalRoomEvents={}", 
                eventId, timestamp, roomId, roomEventId);
        
        // 방 이벤트 카운터 제거
        roomEventCounters.remove(roomId);
    }

    /**
     * 라운드 시작 로깅
     */
    public void logRoundStarted(String roomId, int roundNumber, int totalRounds, int durationSeconds, int participantCount) {
        long eventId = eventCounter.incrementAndGet();
        long roomEventId = roomEventCounters.computeIfAbsent(roomId, k -> new AtomicLong(0)).incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        log.info("[EVENT#{}] [{}] [ROUND_STARTED] roomId={}, roomEventId={}, round={}/{}, duration={}s, participants={}", 
                eventId, timestamp, roomId, roomEventId, roundNumber, totalRounds, durationSeconds, participantCount);
    }

    /**
     * 라운드 종료 로깅
     */
    public void logRoundEnded(String roomId, int roundNumber, int totalRounds) {
        long eventId = eventCounter.incrementAndGet();
        long roomEventId = roomEventCounters.computeIfAbsent(roomId, k -> new AtomicLong(0)).incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        log.info("[EVENT#{}] [{}] [ROUND_ENDED] roomId={}, roomEventId={}, round={}/{}", 
                eventId, timestamp, roomId, roomEventId, roundNumber, totalRounds);
    }

    /**
     * 페어 배정 로깅
     */
    public void logPairsAssigned(String roomId, int roundNumber, Map<Long, Long> pairMap) {
        long eventId = eventCounter.incrementAndGet();
        long roomEventId = roomEventCounters.computeIfAbsent(roomId, k -> new AtomicLong(0)).incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        // 페어 수 계산 (양방향이므로 2로 나눔)
        int pairCount = pairMap.size() / 2;
        
        log.info("[EVENT#{}] [{}] [PAIRS_ASSIGNED] roomId={}, roomEventId={}, round={}, pairs={}", 
                eventId, timestamp, roomId, roomEventId, roundNumber, pairCount);
        
        // 각 페어 상세 로깅
        pairMap.forEach((userId, partnerId) -> {
            if (partnerId != null && userId < partnerId) { // 중복 방지
                log.debug("[EVENT#{}] [PAIR_DETAIL] roomId={}, round={}, userId1={}, userId2={}", 
                        eventId, roomId, roundNumber, userId, partnerId);
            }
        });
    }

    /**
     * OpenVidu Session 생성 로깅
     */
    public void logOpenViduSessionCreated(String roomId, String sessionId) {
        long eventId = eventCounter.incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        log.info("[EVENT#{}] [{}] [OPENVIDU_SESSION_CREATED] roomId={}, sessionId={}", 
                eventId, timestamp, roomId, sessionId);
    }

    /**
     * OpenVidu Token 발급 로깅
     */
    public void logOpenViduTokenGenerated(String roomId, Long userId, String connectionId) {
        long eventId = eventCounter.incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        log.info("[EVENT#{}] [{}] [OPENVIDU_TOKEN_GENERATED] roomId={}, userId={}, connectionId={}", 
                eventId, timestamp, roomId, userId, connectionId);
    }

    /**
     * 메시지 전송 로깅
     */
    public void logMessageSent(String sessionId, String messageType, Long userId) {
        long eventId = eventCounter.incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        log.debug("[EVENT#{}] [{}] [MESSAGE_SENT] sessionId={}, type={}, userId={}", 
                eventId, timestamp, sessionId, messageType, userId);
    }

    /**
     * 메시지 수신 로깅
     */
    public void logMessageReceived(String sessionId, String messageType, Long userId) {
        long eventId = eventCounter.incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        log.debug("[EVENT#{}] [{}] [MESSAGE_RECEIVED] sessionId={}, type={}, userId={}", 
                eventId, timestamp, sessionId, messageType, userId);
    }

    /**
     * 브로드캐스트 로깅
     */
    public void logBroadcast(String roomId, String messageType, int recipientCount) {
        long eventId = eventCounter.incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        log.info("[EVENT#{}] [{}] [BROADCAST] roomId={}, type={}, recipients={}", 
                eventId, timestamp, roomId, messageType, recipientCount);
    }

    /**
     * 에러 로깅
     */
    public void logError(String context, String errorCode, String errorMessage, Long userId) {
        long eventId = eventCounter.incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        log.error("[EVENT#{}] [{}] [ERROR] context={}, code={}, message={}, userId={}", 
                eventId, timestamp, context, errorCode, errorMessage, userId);
    }

    /**
     * 방 상태 스냅샷 로깅
     */
    public void logRoomSnapshot(RoomState room) {
        long eventId = eventCounter.incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        List<ParticipantState> participants = room.getParticipantList();
        String participantIds = participants.stream()
                .map(p -> String.valueOf(p.getUserId()))
                .reduce((a, b) -> a + "," + b)
                .orElse("");
        
        log.info("[EVENT#{}] [{}] [ROOM_SNAPSHOT] roomId={}, mode={}, participants=[{}], roundActive={}", 
                eventId, timestamp, room.getRoomId(), room.getMode(), 
                participantIds, room.isRoundActive());
    }

    /**
     * 로테이션 시작 로깅
     */
    public void logRotationStarted(String roomId, int totalRounds, int participantCount) {
        long eventId = eventCounter.incrementAndGet();
        long roomEventId = roomEventCounters.computeIfAbsent(roomId, k -> new AtomicLong(0)).incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        log.info("[EVENT#{}] [{}] [ROTATION_STARTED] roomId={}, roomEventId={}, totalRounds={}, participants={}", 
                eventId, timestamp, roomId, roomEventId, totalRounds, participantCount);
    }

    /**
     * 로테이션 중지 로깅
     */
    public void logRotationStopped(String roomId, String reason) {
        long eventId = eventCounter.incrementAndGet();
        long roomEventId = roomEventCounters.computeIfAbsent(roomId, k -> new AtomicLong(0)).incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        log.info("[EVENT#{}] [{}] [ROTATION_STOPPED] roomId={}, roomEventId={}, reason={}", 
                eventId, timestamp, roomId, roomEventId, reason);
    }

    /**
     * 전체 통계 로깅
     */
    public void logStatistics(int totalRooms, int totalParticipants, int activeRotations) {
        long eventId = eventCounter.incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        log.info("[EVENT#{}] [{}] [STATISTICS] totalRooms={}, totalParticipants={}, activeRotations={}, totalEvents={}", 
                eventId, timestamp, totalRooms, totalParticipants, activeRotations, eventCounter.get());
    }

    /**
     * 이벤트 카운터 리셋 (테스트용)
     */
    public void resetCounters() {
        eventCounter.set(0);
        roomEventCounters.clear();
        log.info("이벤트 카운터 리셋 완료");
    }

    /**
     * 전체 이벤트 수 조회
     */
    public long getTotalEventCount() {
        return eventCounter.get();
    }

    /**
     * 특정 방의 이벤트 수 조회
     */
    public long getRoomEventCount(String roomId) {
        return roomEventCounters.getOrDefault(roomId, new AtomicLong(0)).get();
    }
    
    // ========== 8단계 로테이션 이벤트 로깅 ==========
    
    /**
     * 투표 제출 로깅
     */
    public void logVoteSubmitted(Long userId, Long targetUserId, boolean isFinalVote) {
        long eventId = eventCounter.incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        log.info("[EVENT#{}] [{}] [VOTE_SUBMITTED] userId={}, targetUserId={}, type={}", 
                eventId, timestamp, userId, targetUserId, isFinalVote ? "FINAL" : "FIRST");
    }
    
    /**
     * 게임 답변 제출 로깅
     */
    public void logGameAnswerSubmitted(Long userId, String answer, String badge) {
        long eventId = eventCounter.incrementAndGet();
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        
        log.info("[EVENT#{}] [{}] [GAME_ANSWER_SUBMITTED] userId={}, answerLength={}, badge={}", 
                eventId, timestamp, userId, answer != null ? answer.length() : 0, badge);
    }
}
