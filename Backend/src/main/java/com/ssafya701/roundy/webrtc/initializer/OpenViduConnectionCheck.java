package com.ssafya701.roundy.webrtc.initializer;

import com.ssafya701.roundy.webrtc.config.OpenViduProperties;
import com.ssafya701.roundy.webrtc.service.OpenViduHealthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 서버 시작 시 OpenVidu 연결 자동 확인
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpenViduConnectionCheck implements ApplicationRunner {

    private final OpenViduHealthService openViduHealthService;
    private final OpenViduProperties openViduProperties;

    @Override
    public void run(ApplicationArguments args) {
        log.info("========================================");
        log.info("🔍 OpenVidu 서버 연결 확인 시작");
        log.info("OpenVidu URL: {}", openViduProperties.getUrl());
        log.info("========================================");

        try {
            // 간단한 연결 확인
            Map<String, Object> pingResult = openViduHealthService.pingOpenViduServer();
            
            if ("SUCCESS".equals(pingResult.get("status"))) {
                log.info("========================================");
                log.info("✅ OpenVidu 서버 연결 성공!");
                log.info("응답 시간: {}", pingResult.get("responseTime"));
                log.info("========================================");
                
                // Ping-Pong 테스트 (선택적)
                log.info("🏓 OpenVidu Ping-Pong 테스트 시작...");
                Map<String, Object> pongResult = openViduHealthService.testOpenViduCommunication();
                
                if ("SUCCESS".equals(pongResult.get("status"))) {
                    log.info("========================================");
                    log.info("🎉 OpenVidu Ping-Pong 테스트 성공!");
                    log.info("테스트 완료: Session 생성 → 조회 → 삭제");
                    log.info("========================================");
                } else {
                    log.warn("========================================");
                    log.warn("⚠️ OpenVidu Ping-Pong 테스트 실패");
                    log.warn("상태: {}", pongResult.get("status"));
                    log.warn("메시지: {}", pongResult.get("message"));
                    log.warn("========================================");
                }
                
            } else {
                log.error("========================================");
                log.error("❌ OpenVidu 서버 연결 실패!");
                log.error("상태: {}", pingResult.get("status"));
                log.error("메시지: {}", pingResult.get("message"));
                log.error("========================================");
                log.warn("⚠️ OpenVidu 기능이 정상적으로 작동하지 않을 수 있습니다.");
            }
            
        } catch (Exception e) {
            log.error("========================================");
            log.error("❌ OpenVidu 연결 확인 중 오류 발생");
            log.error("오류 메시지: {}", e.getMessage());
            log.error("========================================");
            log.warn("⚠️ OpenVidu 서버 설정을 확인하세요.");
        }
    }
}
