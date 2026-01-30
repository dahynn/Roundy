package com.ssafya701.roundy.webrtc.initializer;

import com.ssafya701.roundy.config.OpenViduProperties;
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
        try {
            // Silent connection check
            Map<String, Object> pingResult = openViduHealthService.pingOpenViduServer();
            
            if ("SUCCESS".equals(pingResult.get("status"))) {
                // Silent ping-pong test
                Map<String, Object> pongResult = openViduHealthService.testOpenViduCommunication();
            }
            
        } catch (Exception e) {
            // Silent error handling
        }
    }
}
