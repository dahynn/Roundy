package com.ssafya701.roundy.webrtc.scheduler;

import com.ssafya701.roundy.webrtc.service.OpenViduHealthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * OpenVidu 서버 주기적 헬스체크 스케줄러
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpenViduHealthCheckScheduler {

    private final OpenViduHealthService openViduHealthService;
    
    private final AtomicInteger successCount = new AtomicInteger(0);
    private final AtomicInteger failCount = new AtomicInteger(0);
    private final AtomicLong totalResponseTime = new AtomicLong(0);
    private final DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    private volatile String lastCheckTime = "미실행";
    private volatile String lastStatus = "UNKNOWN";
    private volatile String lastResponseTime = "N/A";

    /**
     * 1분마다 OpenVidu 서버 연결 확
     **/
    @Scheduled(cron = "0 * * * * *")  // 매분 0초에 실행
    public void checkOpenViduHealth() {
        try {
            Map<String, Object> result = openViduHealthService.pingOpenViduServer();
            updateStatistics(result);
            
        } catch (Exception e) {
            failCount.incrementAndGet();
            lastStatus = "ERROR";
            lastCheckTime = LocalDateTime.now().format(timeFormatter);
        }
    }

    /**
     * 10분마다 상세한 통신 테스트 (Ping-Pong)
     * Session 생성 → 조회 → 삭제 전체 플로우 확인
     */
    @Scheduled(cron = "0 */10 * * * *")  // 매 10분마다 실행
    public void detailedHealthCheck() {
        try {
            Map<String, Object> result = openViduHealthService.testOpenViduCommunication();
        } catch (Exception e) {
            // Silent health check
        }
    }

    /**
     * 통계 업데이트
     */
    private void updateStatistics(Map<String, Object> result) {
        String status = (String) result.get("status");
        lastStatus = status;
        lastCheckTime = LocalDateTime.now().format(timeFormatter);
        lastResponseTime = (String) result.get("responseTime");
        
        if ("SUCCESS".equals(status)) {
            successCount.incrementAndGet();
            
            // 평균 응답시간 계산을 위한 누적
            String responseTimeStr = (String) result.get("responseTime");
            if (responseTimeStr != null) {
                try {
                    long responseTime = Long.parseLong(responseTimeStr.replace("ms", ""));
                    totalResponseTime.addAndGet(responseTime);
                } catch (NumberFormatException e) {
                    // 무시
                }
            }
        } else {
            failCount.incrementAndGet();
        }
    }

    /**
     * 통계 정보 조회 (API 또는 모니터링용)
     */
    public Map<String, Object> getHealthCheckStatistics() {
        int total = successCount.get() + failCount.get();
        double successRate = total > 0 ? (successCount.get() * 100.0 / total) : 0;
        long avgResponseTime = successCount.get() > 0 ? 
            totalResponseTime.get() / successCount.get() : 0;
        
        return Map.of(
            "lastCheckTime", lastCheckTime,
            "lastStatus", lastStatus,
            "lastResponseTime", lastResponseTime,
            "totalChecks", total,
            "successCount", successCount.get(),
            "failCount", failCount.get(),
            "successRate", String.format("%.2f%%", successRate),
            "avgResponseTime", avgResponseTime + "ms"
        );
    }

    /**
     * 통계 초기화
     */
    public void resetStatistics() {
        successCount.set(0);
        failCount.set(0);
        totalResponseTime.set(0);
        lastCheckTime = "미실행";
        lastStatus = "UNKNOWN";
        lastResponseTime = "N/A";
    }
}
