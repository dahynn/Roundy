package com.ssafya701.roundy.webrtc.controller;

import com.ssafya701.roundy.webrtc.scheduler.OpenViduHealthCheckScheduler;
import com.ssafya701.roundy.webrtc.service.OpenViduHealthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * OpenVidu 서버 연결 확인 API
 */
@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class OpenViduHealthController {

    private final OpenViduHealthService openViduHealthService;
    private final OpenViduHealthCheckScheduler healthCheckScheduler;

    /**
     * OpenVidu 서버 연결 확인 (간단한 Ping)
     * 
     * GET /api/health/openvidu
     * 
     * @return 연결 상태 정보
     */
    @GetMapping("/openvidu")
    public ResponseEntity<Map<String, Object>> checkOpenViduConnection() {
        Map<String, Object> result = openViduHealthService.pingOpenViduServer();
        
        // 연결 실패 시 500 에러 반환
        if ("FAILED".equals(result.get("status")) || "ERROR".equals(result.get("status"))) {
            return ResponseEntity.internalServerError().body(result);
        }
        
        return ResponseEntity.ok(result);
    }

    /**
     * OpenVidu 서버 양방향 통신 테스트 (Ping-Pong)
     * Session 생성 → 조회 → 삭제로 전체 통신 확인
     * 
     * GET /api/health/openvidu/ping-pong
     * 
     * @return 통신 테스트 결과
     */
    @GetMapping("/openvidu/ping-pong")
    public ResponseEntity<Map<String, Object>> testOpenViduPingPong() {
        Map<String, Object> result = openViduHealthService.testOpenViduCommunication();
        
        // 테스트 실패 시 500 에러 반환
        if ("FAILED".equals(result.get("status")) || "ERROR".equals(result.get("status"))) {
            return ResponseEntity.internalServerError().body(result);
        }
        
        return ResponseEntity.ok(result);
    }

    /**
     * OpenVidu 헬스체크 통계 조회
     * 정기 헬스체크의 통계 정보 반환
     * 
     * GET /api/health/openvidu/statistics
     * 
     * @return 헬스체크 통계 정보
     */
    @GetMapping("/openvidu/statistics")
    public ResponseEntity<Map<String, Object>> getHealthCheckStatistics() {
        Map<String, Object> statistics = healthCheckScheduler.getHealthCheckStatistics();
        return ResponseEntity.ok(statistics);
    }

    /**
     * OpenVidu 헬스체크 통계 초기화
     * 
     * POST /api/health/openvidu/statistics/reset
     * 
     * @return 초기화 결과
     */
    @PostMapping("/openvidu/statistics/reset")
    public ResponseEntity<Map<String, String>> resetHealthCheckStatistics() {
        healthCheckScheduler.resetStatistics();
        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "message", "헬스체크 통계가 초기화되었습니다."
        ));
    }
}
