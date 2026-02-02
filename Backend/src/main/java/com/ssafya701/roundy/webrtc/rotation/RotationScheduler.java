package com.ssafya701.roundy.webrtc.rotation;

import com.ssafya701.roundy.webrtc.room.ParticipantState;
import com.ssafya701.roundy.webrtc.room.RoomState;
import com.ssafya701.roundy.webrtc.room.enums.Stage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.*;

/**
 * 로테이션 스케줄러
 * room별로 타이머를 관리하고 라운드를 자동으로 진행
 * 
 * 동작 방식:
 * 1. 방 생성 시 스케줄러 시작
 * 2. ROUND_START 발행 → (PAIR_ONLY면 페어링) → 타이머 시작
 * 3. 타이머 종료 시 ROUND_END 발행 → 다음 라운드 스케줄링
 * 4. 마지막 라운드 종료 또는 방 삭제 시 스케줄러 중지
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RotationScheduler {
    
    private final RoomEventPublisher eventPublisher;
    private final PairingStrategy pairingStrategy = new PairingStrategy();
    private final StageExecutor stageExecutor;
    
    @Value("${webrtc.round.duration-seconds:300}")
    private int defaultRoundDurationSeconds;
    
    @Value("${webrtc.round.interval-seconds:10}")
    private int intervalBetweenRoundsSeconds;
    
    // 방별 스케줄러 관리
    private final Map<String, RoomScheduler> roomSchedulers = new ConcurrentHashMap<>();
    
    // 공용 스레드 풀
    private final ScheduledExecutorService executorService = Executors.newScheduledThreadPool(10);
    
    /**
     * 방의 로테이션 시작
     * 
     * @param room 방 상태
     * @param totalRounds 총 라운드 수 (null이면 자동 계산)
     */
    public void startRotation(RoomState room, Integer totalRounds) {
        String roomId = room.getRoomId();
        
        // 이미 실행 중이면 중지 후 재시작
        stopRotation(roomId);
        
        // 총 라운드 수 결정
        int rounds = totalRounds != null ? totalRounds 
                : pairingStrategy.calculateTotalRounds(room.getParticipantCount());
        
        if (rounds == 0) {
            return;
        }
        
        RoundInfo roundInfo = new RoundInfo(1, rounds, defaultRoundDurationSeconds);
        room.setCurrentRound(roundInfo);
        
        RoomScheduler scheduler = new RoomScheduler(room, roundInfo);
        roomSchedulers.put(roomId, scheduler);
        
        // 첫 라운드 시작
        scheduler.scheduleRound();
    }
    
    /**
     * 방의 로테이션 중지
     * 
     * @param roomId 방 ID
     */
    public void stopRotation(String roomId) {
        RoomScheduler scheduler = roomSchedulers.remove(roomId);
        if (scheduler != null) {
            scheduler.cancel();
        }
    }
    
    /**
     * 모든 로테이션 중지 (종료 시 호출)
     */
    public void shutdown() {
        // 모든 방 스케줄러 취소
        roomSchedulers.values().forEach(RoomScheduler::cancel);
        roomSchedulers.clear();
        
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
    }
    
    /**
     * 특정 방의 로테이션 상태 확인
     */
    public boolean isRotationActive(String roomId) {
        return roomSchedulers.containsKey(roomId);
    }
    
    /**
     * 방별 스케줄러 내부 클래스
     */
    private class RoomScheduler {
        private final RoomState room;
        private RoundInfo currentRound;
        private ScheduledFuture<?> currentTask;
        
        public RoomScheduler(RoomState room, RoundInfo initialRound) {
            this.room = room;
            this.currentRound = initialRound;
        }
        
        /**
         * 라운드 스케줄링
         */
        public void scheduleRound() {
            if (currentRound.isLastRound() && currentRound.getCurrentRound() > currentRound.getTotalRounds()) {
                stopRotation(room.getRoomId());
                return;
            }
            
            // ROUND_START 발행
            eventPublisher.publishRoundStart(
                room, 
                currentRound.getCurrentRound(), 
                currentRound.getDurationSeconds()
            );
            
            // PAIR_ONLY 모드면 페어 배정
            if (room.isPairMode()) {
                publishPairAssignments();
            }
            
            // 라운드 종료 타이머 설정
            currentTask = executorService.schedule(
                this::onRoundEnd,
                currentRound.getDurationSeconds(),
                TimeUnit.SECONDS
            );
        }
        
        /**
         * 페어 배정 발행
         */
        private void publishPairAssignments() {
            List<ParticipantState> participants = room.getParticipantList();
            List<PairingStrategy.Pair> pairs = pairingStrategy.calculatePairs(
                participants, 
                currentRound.getCurrentRound(),
                false  // FREE_TALK 모드: 성별 무관 페어링
            );
            
            // userId -> partnerId 맵 생성
            Map<Long, Long> pairMap = new HashMap<>();
            for (PairingStrategy.Pair pair : pairs) {
                pairMap.put(pair.getUserId1(), pair.getUserId2());
                if (pair.getUserId2() != null) {
                    pairMap.put(pair.getUserId2(), pair.getUserId1());
                }
            }
            
            eventPublisher.publishPairAssignments(
                room, 
                currentRound.getCurrentRound(), 
                pairMap
            );
        }
        
        /**
         * 라운드 종료 처리
         */
        private void onRoundEnd() {
            // ROUND_END 발행
            eventPublisher.publishRoundEnd(room, currentRound.getCurrentRound());
            
            // 다음 라운드 준비
            if (!currentRound.isLastRound()) {
                currentRound = currentRound.nextRound();
                room.setCurrentRound(currentRound);
                
                // 인터벌 후 다음 라운드 시작
                currentTask = executorService.schedule(
                    this::scheduleRound,
                    intervalBetweenRoundsSeconds,
                    TimeUnit.SECONDS
                );
            } else {
                // 마지막 라운드 완료
                room.setCurrentRound(null);
                stopRotation(room.getRoomId());
            }
        }
        
        /**
         * 스케줄러 취소
         */
        public void cancel() {
            if (currentTask != null && !currentTask.isDone()) {
                currentTask.cancel(false);
            }
        }
    }
}
