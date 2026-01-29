package com.ssafya701.roundy.webrtc.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * OpenVidu 서버 연결 확인 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OpenViduHealthService {

    private final WebClient openViduWebClient;

    /**
     * OpenVidu 서버 연결 확인 (Ping)
     * 
     * @return 연결 상태 정보
     */
    public Map<String, Object> pingOpenViduServer() {
        Map<String, Object> result = new HashMap<>();
        long startTime = System.currentTimeMillis();

        try {
            // OpenVidu API로 GET /openvidu/api/config 호출 (헬스체크용)
            String response = openViduWebClient.get()
                .uri("/openvidu/api/config")
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(5))
                .block();

            long responseTime = System.currentTimeMillis() - startTime;

            result.put("status", "SUCCESS");
            result.put("message", "OpenVidu 서버 연결 성공");
            result.put("responseTime", responseTime + "ms");
            result.put("response", response);

        } catch (WebClientResponseException e) {
            long responseTime = System.currentTimeMillis() - startTime;
            
            result.put("status", "FAILED");
            result.put("message", "OpenVidu 서버 응답 오류: " + e.getStatusCode());
            result.put("responseTime", responseTime + "ms");
            result.put("error", e.getResponseBodyAsString());

        } catch (Exception e) {
            long responseTime = System.currentTimeMillis() - startTime;
            
            result.put("status", "ERROR");
            result.put("message", "OpenVidu 서버 연결 오류");
            result.put("responseTime", responseTime + "ms");
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * OpenVidu 서버와 양방향 통신 테스트 (Ping-Pong)
     * Session 생성 → 조회 → 삭제로 전체 통신 확인
     * 
     * @return 통신 테스트 결과
     */
    public Map<String, Object> testOpenViduCommunication() {
        Map<String, Object> result = new HashMap<>();
        String testSessionId = "test-ping-pong-" + System.currentTimeMillis();
        
        try {
            // 1. Session 생성 (PING)
            String createResponse = openViduWebClient.post()
                .uri("/openvidu/api/sessions")
                .bodyValue(String.format("{\"customSessionId\":\"%s\"}", testSessionId))
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(5))
                .block();

            // 2. Session 조회 (PONG)
            String getResponse = openViduWebClient.get()
                .uri("/openvidu/api/sessions/" + testSessionId)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(5))
                .block();

            // 3. Session 삭제 (CLEANUP)
            openViduWebClient.delete()
                .uri("/openvidu/api/sessions/" + testSessionId)
                .retrieve()
                .bodyToMono(Void.class)
                .timeout(Duration.ofSeconds(5))
                .block();

            result.put("status", "SUCCESS");
            result.put("message", "OpenVidu Ping-Pong 테스트 성공");
            result.put("testSessionId", testSessionId);
            result.put("steps", Map.of(
                "1_create", "SUCCESS",
                "2_get", "SUCCESS",
                "3_delete", "SUCCESS"
            ));

        } catch (WebClientResponseException e) {
            result.put("status", "FAILED");
            result.put("message", "OpenVidu 통신 실패: " + e.getStatusCode());
            result.put("error", e.getResponseBodyAsString());
            
            // 실패 시에도 정리 시도
            cleanupTestSession(testSessionId);

        } catch (Exception e) {
            result.put("status", "ERROR");
            result.put("message", "OpenVidu 통신 오류");
            result.put("error", e.getMessage());
            
            // 오류 시에도 정리 시도
            cleanupTestSession(testSessionId);
        }

        return result;
    }

    /**
     * 테스트 Session 정리
     */
    private void cleanupTestSession(String sessionId) {
        try {
            openViduWebClient.delete()
                .uri("/openvidu/api/sessions/" + sessionId)
                .retrieve()
                .bodyToMono(Void.class)
                .timeout(Duration.ofSeconds(3))
                .onErrorResume(e -> Mono.empty())
                .block();
        } catch (Exception e) {
            // Silent cleanup
        }
    }
}
