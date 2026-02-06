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
        
        // [수정] 바로 SELF_INTRO로 가는 것이 아니라, BREAK(5초) 후 시작
        log.info("🎬 8단계 로테이션 시작 전 휴식(Break): roomId={}", roomId);
        
        room.setPendingNextStage(Stage.SELF_INTRO); // 다음 단계 예약
        room.setCurrentStage(Stage.BREAK);          // 현재 단계 휴식
        
        stageExecutor.executeBreak(room);
        
        // 다음 스테이지로 자동 전환 스케줄링 (BREAK -> SELF_INTRO)
        scheduleNextStage(room, Stage.BREAK);

        // [DB 연동] Session 상태 RUNNING으로 변경
        Long dbSessionId = room.getDbSessionId();
        if (dbSessionId != null) {
            sessionRepository.findById(dbSessionId).ifPresent(session -> {
                session.updateStatus(com.ssafya701.roundy.match.enums.SessionStatus.ONGOING);
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
        
        // 0. 만약 현재 스테이지가 BREAK였다면 -> 저장해둔 다음 스테이지로 진행
        if (currentStage == Stage.BREAK) {
             Stage realNextStage = room.getPendingNextStage();
             log.info("☕ 휴식 종료: roomId={}, 다음 스테이지={}", roomId, realNextStage);
             
             // 다음 스테이지 실행을 위해 재귀 호출과 유사하게 처리하지만, 이번엔 break 체크 없이 바로 다음으로 가야 함
             // 하지만 로테이션 반복 등 복잡한 로직이 있으므로, 아래 로직을 태우되 isRepeating 체크 주의
             // -> 간단히: 여기서 결정된 realNextStage를 실행하도록 아래 로직을 건너뛰게 하거나,
             //    아예 메서드를 분리하는게 좋음. 
             //    하지만 기존 구조 유지 위해: currentStage를 BREAK로 보고 "다음"을 계산하는 게 아니라,
             //    이미 계산된 realNextStage를 바로 스케줄링하도록 함.
             
             int delaySeconds = currentStage.getDurationSeconds(); // 5초
             scheduleStageExecution(room, realNextStage, delaySeconds);
             return;
        }

        // 동적 로테이션 루프 처리
        Stage nextStage = null;
        boolean isRepeating = false;
        
        if (currentStage == Stage.SELF_INTRO) {
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
                nextStage = currentStage;
                isRepeating = true;
                room.nextRotationRound();
                log.info("🔄 로테이션 반복: roomId={}, round={}/{}", roomId, currentRound + 1, maxRounds);
            }
        }
        
        if (!isRepeating) {
            nextStage = currentStage.getNextStage();
            if (nextStage != null) {
                room.resetRotationRound();
            }
        }
        
        if (nextStage == null) {
            scheduleRoomCleanup(room, currentStage);
            return;
        }

        // [추가] 쉬는 시간(BREAK)이 필요한 구간인지 확인
        // 제외: 자기소개 반복 중, 로테이션 반복 중(isRepeating=true일 때는 위에서 걸러짐? 아님. Rotation은 라운드 바뀔때도 쉬는시간 필요)
        // 로테이션 반복(라운드 변경) 때도 쉬는시간이 필요함! 
        // 1. SELF_INTRO 완료 -> VOTE_FIRST (Break)
        // 2. VOTE_FIRST 완료 -> ROTATION_SHORT (Break & Result)
        // 3. ROTATION 완료 -> 다음 ROTATION (Break) 
        //    -> isRepeating=true일 때도 라운드가 바뀌었으면 Break 필요
        // 4. ROTATION 완료 -> VOTE_FINAL (Break)
        
        boolean needBreak = false;
        
        // 1. 자기소개 끝 (반복 아님) -> 투표
        if (currentStage == Stage.SELF_INTRO && !isRepeating) {
            needBreak = true;
        }
        // 2. 첫인상 투표 끝 -> 로테이션
        else if (currentStage == Stage.VOTE_FIRST) {
            needBreak = true;
        }
        // 3. 로테이션 중 라운드 변경 (isRepeating=true여도 라운드 바뀌면 휴식)
        else if (currentStage.isRotationStage()) {
             // 로테이션 스테이지는 항상 끝날 때마다 휴식 (다음 라운드든, 다음 스테이지든)
             needBreak = true;
        }
        // 4. 최종 투표 끝 -> 매칭 결과
        else if (currentStage == Stage.VOTE_FINAL) {
             needBreak = true;
        }
        // 5. 매칭 결과 -> 얼굴 공개
        else if (currentStage == Stage.MATCHING_RESULT) {
             needBreak = true;
        }
        
        Stage targetStage = nextStage;
        int delaySeconds = currentStage.getDurationSeconds();
        
        if (needBreak) {
            log.info("🛑 쉬는 시간 진입(Break): roomId={}, {} -> BREAK -> {}", roomId, currentStage, targetStage);
            room.setPendingNextStage(targetStage); // 실제 갈 곳 저장
            targetStage = Stage.BREAK;             // 목표는 BREAK
        } else {
            log.info("⏰ 다음 스테이지 예약: roomId={}, {} → {} ({}초 후)", roomId, currentStage, targetStage, delaySeconds);
        }
        
        scheduleStageExecution(room, targetStage, delaySeconds);
    }

    /**
     * 실제 타이머 등록 및 실행
     */
    private void scheduleStageExecution(RoomState room, Stage nextStage, int delaySeconds) {
        String roomId = room.getRoomId();
        
        ScheduledFuture<?> timer = executorService.schedule(() -> {
            try {
                room.setCurrentStage(nextStage);
                executeStage(room, nextStage);
                // 재귀 예약
                scheduleNextStage(room, nextStage);
            } catch (Exception e) {
                log.error("스테이지 전환 실패: roomId={}, stage={}", roomId, nextStage, e);
            }
        }, delaySeconds, TimeUnit.SECONDS);
        
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
            case BREAK -> stageExecutor.executeBreak(room);
            case SELF_INTRO -> stageExecutor.executeSelfIntro(room);
            case VOTE_FIRST -> stageExecutor.executeVote(room, true);
            case ROTATION_SHORT -> stageExecutor.executeRotation(room, false);
            // case IMAGE_GAME -> stageExecutor.executeGame(room); // [수정] 이미지 게임 건너뛰기
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
