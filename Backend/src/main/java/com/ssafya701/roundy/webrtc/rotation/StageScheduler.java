package com.ssafya701.roundy.webrtc.rotation;

import com.ssafya701.roundy.webrtc.room.RoomState;
import com.ssafya701.roundy.webrtc.room.enums.Stage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.*;

/**
 * 8단계 로테이션 자동 전환 스케줄러
 * 각 스테이지의 시간이 만료되면 자동으로 다음 스테이지로 전환
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StageScheduler {
    
    private final StageExecutor stageExecutor;
    private final com.ssafya701.roundy.match.repository.SessionRepository sessionRepository;
    
    // 방별 스케줄러 관리
    private final Map<String, ScheduledFuture<?>> roomTimers = new ConcurrentHashMap<>();
    
    // 전역 스레드 풀
    private final ScheduledExecutorService executorService = Executors.newScheduledThreadPool(10);
    
    /**
     * 8단계 로테이션 시작 (SELF_INTRO부터 자동 진행)
     * 
     * @param room 방 상태
     */
    public void startStageRotation(RoomState room) {
        String roomId = room.getRoomId();
        
        // 이미 실행 중이면 중지 후 재시작
        stopStageRotation(roomId);
        
        // SELF_INTRO 단계 시작
        room.setCurrentStage(Stage.SELF_INTRO);
        stageExecutor.executeSelfIntro(room);
        
        // 다음 스테이지로 자동 전환 스케줄링
        scheduleNextStage(room, Stage.SELF_INTRO);
        
        log.info("🎬 8단계 로테이션 자동 시작: roomId={}", roomId);

        // [DB 연동] Session 상태 RUNNING으로 변경
        Long dbSessionId = room.getDbSessionId();
        if (dbSessionId != null) {
            sessionRepository.findById(dbSessionId).ifPresent(session -> {
                session.updateStatus(com.ssafya701.roundy.match.enums.SessionStatus.RUNNING);
                sessionRepository.save(session);
                log.info("Session DB 상태 업데이트(RUNNING): id={}", dbSessionId);
            });
        }
    }
    
    /**
     * 다음 스테이지로 자동 전환 스케줄링
     * 
     * @param room 방 상태
     * @param currentStage 현재 스테이지
     */
    private void scheduleNextStage(RoomState room, Stage currentStage) {
        String roomId = room.getRoomId();
        
        // 동적 로테이션 루프 처리
        // ROTATION_SHORT 또는 ROTATION_LONG 단계인 경우, 모든 라운드를 돌았는지 확인
        Stage nextStage = null;
        boolean isRepeating = false;
        
        if (currentStage == Stage.SELF_INTRO) {
            // 남은 발언자가 있으면 스테이지 반복
            if (room.getRemainingspeakers() > 0) {
                nextStage = currentStage;
                isRepeating = true;
                log.info("📢 자기소개 반복: roomId={}, 남은발언자={}", roomId, room.getRemainingspeakers());
            }
        }

        if (currentStage.isRotationStage()) {
            int currentRound = room.getCurrentRotationRound();
            int maxRounds = room.getMaxRotationRounds();
            
            if (currentRound < maxRounds) {
                // 아직 라운드가 남았으면 현재 스테이지 반복
                nextStage = currentStage;
                isRepeating = true;
                
                // 다음 라운드로 증가
                room.nextRotationRound();
                log.info("🔄 로테이션 반복: roomId={}, round={}/{}", roomId, currentRound + 1, maxRounds);
            }
        }
        
        // 반복이 아니면 다음 스테이지로 진행
        if (!isRepeating) {
            nextStage = currentStage.getNextStage();
            // 스테이지가 바뀌면 라운드 초기화
            if (nextStage != null) {
                room.resetRotationRound();
            }
        }
        
        if (nextStage == null) {
            // FACE_REVEAL이 마지막 스테이지 → 자동 정리 예약
            scheduleRoomCleanup(room, currentStage);
            return;
        }
        
        int delaySeconds = currentStage.getDurationSeconds();
        
        log.info("⏰ 다음 스테이지 예약: roomId={}, {} → {} ({}초 후)", 
                roomId, currentStage, nextStage, delaySeconds);
        
        Stage finalNextStage = nextStage;
        
        // 타이머 설정
        ScheduledFuture<?> timer = executorService.schedule(() -> {
            try {
                // 다음 스테이지로 전환 (반복인 경우 set만 하고 로직 실행)
                room.setCurrentStage(finalNextStage);
                executeStage(room, finalNextStage);
                
                // 재귀적으로 그 다음 스테이지 예약
                scheduleNextStage(room, finalNextStage);
                
            } catch (Exception e) {
                log.error("스테이지 전환 실패: roomId={}, stage={}", roomId, finalNextStage, e);
            }
        }, delaySeconds, TimeUnit.SECONDS);
        
        // 타이머 저장
        roomTimers.put(roomId, timer);
    }
    
    /**
     * 로테이션 완료 후 방 정리 (FACE_REVEAL 종료 시)
     */
    private void scheduleRoomCleanup(RoomState room, Stage lastStage) {
        String roomId = room.getRoomId();
        int cleanupDelay = lastStage.getDurationSeconds();
        
        log.info("🏁 로테이션 완료 예정: roomId={}, {}초 후 방 정리", roomId, cleanupDelay);
        
        ScheduledFuture<?> timer = executorService.schedule(() -> {
            log.info("🧹 8단계 로테이션 완료 - 방 정리: roomId={}", roomId);
            
            // 스케줄러 정리
            stopStageRotation(roomId);
            
            // 참가자들은 WebSocket 종료 시 자동으로 처리됨
            // 클라이언트가 직접 연결을 끊거나 새로고침하면 자동 정리
            
        }, cleanupDelay, TimeUnit.SECONDS);
        
        roomTimers.put(roomId, timer);
    }
    
    /**
     * 스테이지별 실행 로직
     */
    private void executeStage(RoomState room, Stage stage) {
        log.info("🎯 스테이지 실행: roomId={}, stage={}, duration={}s", 
                room.getRoomId(), stage, stage.getDurationSeconds());
        
        switch (stage) {
            case SELF_INTRO -> stageExecutor.executeSelfIntro(room);
            case VOTE_FIRST -> stageExecutor.executeVote(room, true);
            case ROTATION_SHORT -> stageExecutor.executeRotation(room, false);
            case IMAGE_GAME -> stageExecutor.executeGame(room);
            case ROTATION_LONG -> stageExecutor.executeRotation(room, true);
            case VOTE_FINAL -> stageExecutor.executeVote(room, false);
            case MATCHING_RESULT -> stageExecutor.executeMatching(room);
            case FACE_REVEAL -> stageExecutor.executeFaceReveal(room);
            default -> log.warn("알 수 없는 스테이지: {}", stage);
        }
    }
    
    /**
     * 특정 방의 로테이션 중지
     * 
     * @param roomId 방 ID
     */
    public void stopStageRotation(String roomId) {
        ScheduledFuture<?> timer = roomTimers.remove(roomId);
        if (timer != null && !timer.isDone()) {
            timer.cancel(false);
            log.info("⏹️  스테이지 로테이션 중지: roomId={}", roomId);
        }
    }
    
    /**
     * 모든 로테이션 중지 (서버 종료 시)
     */
    public void shutdown() {
        log.info("🛑 StageScheduler 종료 중...");
        
        // 모든 타이머 취소
        roomTimers.values().forEach(timer -> {
            if (!timer.isDone()) {
                timer.cancel(false);
            }
        });
        roomTimers.clear();
        
        // 스레드 풀 종료
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(5, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            Thread.currentThread().interrupt();
        }
        
        log.info("✅ StageScheduler 종료 완료");
    }
    
    /**
     * 특정 방의 로테이션 활성 여부 확인
     * 
     * @param roomId 방 ID
     * @return 활성 여부
     */
    public boolean isActive(String roomId) {
        return roomTimers.containsKey(roomId);
    }
}
