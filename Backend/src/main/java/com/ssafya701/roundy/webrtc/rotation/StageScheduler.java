package com.ssafya701.roundy.webrtc.rotation;

import com.ssafya701.roundy.webrtc.room.RoomState;
import com.ssafya701.roundy.webrtc.room.enums.Stage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
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

    private final ScheduledExecutorService executorService = Executors.newScheduledThreadPool(1);
    private final Map<String, ScheduledFuture<?>> roomTimers = new ConcurrentHashMap<>();

    // 순환 참조 방지를 위해 RoomEventPublisher 사용
    private final RoomEventPublisher eventPublisher;
    private final StageExecutor stageExecutor;
    private final com.ssafya701.roundy.match.repository.SessionRepository sessionRepository;

    /**
     * 8단계 로테이션 시작 (BREAK부터)
     */
    public void startStageRotation(RoomState room) {
        String roomId = room.getRoomId();
        stopStageRotation(roomId);

        log.info("🎬 8단계 로테이션 시작: roomId={}", roomId);

        // 첫 단계는 BREAK (또는 초기화 후 바로 진행)
        // 여기서는 바로 startTransition으로 진입
        // BREAK (10초) -> SELF_INTRO

        room.setPendingNextStage(Stage.SELF_INTRO);
        startTransition(room, Stage.BREAK);

        // [DB 연동] Session 상태 RUNNING ... (기존 유지)
        Long dbSessionId = room.getDbSessionId();
        if (dbSessionId != null) {
            sessionRepository.findById(dbSessionId).ifPresent(session -> {
                session.updateStatus(com.ssafya701.roundy.match.enums.SessionStatus.ONGOING);
                sessionRepository.save(session);
            });
        }
    }

    /**
     * [Phase 1] 스테이지 전환 및 렌더링 대기 시작
     */
    private void startTransition(RoomState room, Stage targetStage) {
        String roomId = room.getRoomId();

        // 1. 스테이지 설정 및 실행 (STAGE_CHANGE 전송)
        room.setCurrentStage(targetStage);
        executeStage(room, targetStage);

        // 2. 렌더링 대기 초기화
        List<Long> participants = room.getParticipantList().stream()
                .map(com.ssafya701.roundy.webrtc.room.ParticipantState::getUserId) // 패키지명 충돌 방지
                .toList();

        room.initRenderWait(participants);
        log.info("⏳ 렌더링 대기 시작: roomId={}, stage={}, 대상={}명", roomId, targetStage, participants.size());

        // 3. 타임아웃 스케줄링 (기본 5초, 투표 결과 관전 시 30초)
        long timeoutSeconds = 5;
        if (targetStage == Stage.BREAK && room.getPendingNextStage() == Stage.ROTATION_SHORT) {
            timeoutSeconds = 30; // 첫인상 투표 결과 관전을 위해 넉넉히 대기
        }

        ScheduledFuture<?> timeoutTask = executorService.schedule(() -> {
            log.warn("⏰ 렌더링 대기 타임아웃: roomId={}, stage={}", roomId, targetStage);
            completeSynchronization(room);
        }, timeoutSeconds, TimeUnit.SECONDS);

        room.setRenderTimeoutTask(timeoutTask);
    }

    /**
     * [Phase 2] 동기화 완료 후 타이머 시작
     * (Handler에서 호출되거나 타임아웃으로 호출됨)
     */
    public void completeSynchronization(RoomState room) {
        String roomId = room.getRoomId();
        Stage currentStage = room.getCurrentStage();

        // 중복 실행 방지 (이미 타이머가 돌고 있다면 스킵)
        // -> clearRenderWait()가 타스크를 캔슬하므로 안전장치 역할
        room.clearRenderWait();

        int duration = currentStage.getDurationSeconds();
        log.info("🚀 스테이지 타이머 시작: roomId={}, stage={}, duration={}s", roomId, currentStage, duration);

        // 1. START_TIMER 브로드캐스트
        eventPublisher.publishStartTimer(room, duration);

        // 2. 스테이지 종료(다음 단계 결정) 예약
        scheduleNextStageProcessing(room, duration);
    }

    /**
     * 스테이지 종료 시점 예약 (Duration 경과 후 다음 단계 결정)
     */
    private void scheduleNextStageProcessing(RoomState room, int delaySeconds) {
        String roomId = room.getRoomId();

        ScheduledFuture<?> timer = executorService.schedule(() -> {
            try {
                // 다음 단계 결정 로직 실행
                determineAndStartNextStage(room);
            } catch (Exception e) {
                log.error("스테이지 전환 실패: roomId={}", roomId, e);
            }
        }, delaySeconds, TimeUnit.SECONDS);

        roomTimers.put(roomId, timer);
    }

    /**
     * 다음 스테이지 결정 및 전환 시작 (기존 scheduleNextStage 로직 이관)
     */
    private void determineAndStartNextStage(RoomState room) {
        Stage currentStage = room.getCurrentStage();
        String roomId = room.getRoomId();

        // 0. BREAK 였던 경우 -> PendingNextStage로 이동
        if (currentStage == Stage.BREAK) {
            Stage realNextStage = room.getPendingNextStage();
            log.info("☕ 휴식 종료 -> 다음: {}", realNextStage);
            startTransition(room, realNextStage);
            return;
        }

        // 동적 로테이션 루프 처리 (기존 로직 유지)
        Stage nextStage = null;
        boolean isRepeating = false;

        if (currentStage == Stage.SELF_INTRO) {
            if (room.getRemainingspeakers() > 0) {
                nextStage = currentStage;
                isRepeating = true;
            }
        }

        if (currentStage.isRotationStage()) {
            int currentRound = room.getCurrentRotationRound();
            int maxRounds = room.getMaxRotationRounds();
            if (currentRound < maxRounds) {
                nextStage = currentStage;
                isRepeating = true;
                room.nextRotationRound();
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

        // 휴식(BREAK) 필요 여부 체크 (기존 로직 유지)
        boolean needBreak = false;
        if (currentStage == Stage.SELF_INTRO && !isRepeating)
            needBreak = true;
        else if (currentStage == Stage.VOTE_FIRST)
            needBreak = true;
        else if (currentStage.isRotationStage())
            needBreak = true;
        else if (currentStage == Stage.VOTE_FINAL)
            needBreak = true;
        else if (currentStage == Stage.MATCHING_RESULT)
            needBreak = true;

        Stage targetStage = nextStage;

        if (needBreak) {
            room.setPendingNextStage(targetStage);
            targetStage = Stage.BREAK;
        }

        // 전환 시작
        startTransition(room, targetStage);
    }

    /**
     * 로테이션 완료 후 방 정리 (FACE_REVEAL 종료 시)
     */
    private void scheduleRoomCleanup(RoomState room, Stage lastStage) {
        String roomId = room.getRoomId();
        int cleanupDelay = lastStage.getDurationSeconds(); // 마지막 스테이지(FACE_REVEAL) 시간만큼 대기

        // FACE_REVEAL도 START_TIMER가 필요함 (클라이언트 싱크 위해)
        // Cleanup 예약은 별도로 하지만, 현재 스테이지 진행(START_TIMER)도 해줘야 함?
        // -> determineAndStartNextStage가 호출된 시점은 "이전 스테이지가 끝난 시점"임.
        // -> FACE_REVEAL이 끝난게 아니라, FACE_REVEAL 다음이 없어서 여기로 온 것.
        // -> 아님. FACE_REVEAL은 getNextStage()가 null임.
        // -> 즉, FACE_REVEAL이 "끝난 후"에 여기로 옴.

        // 수정: FACE_REVEAL은 실행되었나?
        // determineAndStartNextStage는 "이번 스테이지 끝났으니 다음 거 뭐냐"를 결정함.
        // 만약 currentStage가 FACE_REVEAL이면, nextStage는 null임.
        // 즉 FACE_REVEAL이 끝난 시점임.

        log.info("🏁 모든 로테이션 종료. 방 정리 시작: roomId={}", roomId);

        // 스케줄러 정리
        stopStageRotation(roomId);

        // (필요 시) 방 정리 로직 수행
    }

    /**
     * 스테이지별 실행 로직 (기존 유지)
     */
    private void executeStage(RoomState room, Stage stage) {
        log.info("🎯 스테이지 전환(실행): roomId={}, stage={}", room.getRoomId(), stage);
        switch (stage) {
            case BREAK -> stageExecutor.executeBreak(room);
            case SELF_INTRO -> stageExecutor.executeSelfIntro(room);
            case VOTE_FIRST -> stageExecutor.executeVote(room, true);
            case ROTATION_SHORT -> stageExecutor.executeRotation(room, false);
            case ROTATION_LONG -> stageExecutor.executeRotation(room, true);
            case VOTE_FINAL -> stageExecutor.executeVote(room, false);
            case MATCHING_RESULT -> stageExecutor.executeMatching(room);
            case FACE_REVEAL -> stageExecutor.executeFaceReveal(room);
            default -> log.warn("알 수 없는 스테이지: {}", stage);
        }
    }

    /**
     * 특정 방의 로테이션 중지
     */
    public void stopStageRotation(String roomId) {
        ScheduledFuture<?> timer = roomTimers.remove(roomId);
        if (timer != null && !timer.isDone()) {
            timer.cancel(false);
        }
        // Room의 Timeout Task도 정리 필요하지만, RoomState 인스턴스를 여기서 바로 조회하긴 어려울 수 있음(Map이 없어서).
        // 보통 startTransition 등에서 room을 받으므로 괜찮음. 외부에서 room.clearRenderWait() 호출해주면 좋음.
    }

    // ... (shutdown, isActive 등 기존 유지) ...
    public void shutdown() {
        // ... (기존 코드) ...
        executorService.shutdown();
        // ...
    }

    public boolean isActive(String roomId) {
        return roomTimers.containsKey(roomId);
    }
}
