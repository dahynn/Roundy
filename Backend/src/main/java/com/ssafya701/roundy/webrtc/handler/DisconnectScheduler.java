package com.ssafya701.roundy.webrtc.handler;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import jakarta.annotation.PreDestroy;
import java.util.Map;
import java.util.concurrent.*;

/**
 * 연결 해제된 사용자의 유예 기간 타이머 관리
 * 
 * 30초 유예 기간 동안 재연결을 기다리며,
 * 유예 기간 만료 시 파트너에게 PARTNER_LEFT 알림
 */
@Slf4j
@Component
public class DisconnectScheduler {
    
    /**
     * 타이머 스레드 풀
     */
    private final ScheduledExecutorService executor = Executors.newScheduledThreadPool(5);
    
    /**
     * 예약된 체크 작업 (roomId-userId -> ScheduledFuture)
     */
    private final Map<String, ScheduledFuture<?>> scheduledChecks = new ConcurrentHashMap<>();
    
    /**
     * 유예 기간 후 연결 해제 체크 예약
     * 
     * @param roomId 방 ID
     * @param userId 사용자 ID
     * @param delayMs 지연 시간 (밀리초)
     * @param callback 유예 기간 만료 시 실행할 콜백
     */
    public void scheduleCheck(String roomId, Long userId, long delayMs, Runnable callback) {
        String key = roomId + "-" + userId;
        
        // 기존 체크가 있으면 취소
        cancelCheck(key);
        
        log.info("⏰ 연결 해제 체크 예약: key={}, delay={}ms", key, delayMs);
        
        // 새 체크 예약
        ScheduledFuture<?> future = executor.schedule(() -> {
            try {
                log.info("⚠️ 유예 기간 만료: key={}", key);
                callback.run();
            } catch (Exception e) {
                log.error("연결 해제 체크 실행 중 오류: key={}", key, e);
            } finally {
                scheduledChecks.remove(key);
            }
        }, delayMs, TimeUnit.MILLISECONDS);
        
        scheduledChecks.put(key, future);
    }
    
    /**
     * 예약된 체크 취소 (사용자 재연결)
     * 
     * @param key roomId-userId 형식의 키
     */
    public void cancelCheck(String key) {
        ScheduledFuture<?> future = scheduledChecks.remove(key);
        if (future != null && !future.isDone()) {
            future.cancel(false);
            log.info("✅ 연결 해제 체크 취소: key={}", key);
        }
    }
    
    /**
     * 스케줄러 종료 (서버 종료 시)
     */
    @PreDestroy
    public void shutdown() {
        log.info("🛑 DisconnectScheduler 종료 중...");
        
        // 모든 예약된 작업 취소
        scheduledChecks.values().forEach(future -> {
            if (!future.isDone()) {
                future.cancel(false);
            }
        });
        scheduledChecks.clear();
        
        // 스레드 풀 종료
        executor.shutdown();
        try {
            if (!executor.awaitTermination(5, TimeUnit.SECONDS)) {
                executor.shutdownNow();
            }
        } catch (InterruptedException e) {
            executor.shutdownNow();
            Thread.currentThread().interrupt();
        }
        
        log.info("✅ DisconnectScheduler 종료 완료");
    }
}
