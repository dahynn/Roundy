package com.ssafya701.roundy.webrtc.config;

import com.ssafya701.roundy.webrtc.handler.WebRtcWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * WebSocket 설정 클래스
 */
@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;
    private final WebRtcWebSocketHandler webRtcWebSocketHandler;

    @Value("${webrtc.ws.path:/ws/webrtc}")
    private String wsPath;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // TODO: [운영 환경] setAllowedOrigins("*") → 환경 변수로 도메인 제한
        // @Value("${webrtc.allowed-origins}") private String[] allowedOrigins;
        // .setAllowedOrigins(allowedOrigins)
        
        // TODO: [브랜치 병합] Spring Security와 통합 시 인증 인터셉터 순서 조정
        // .addInterceptors(rateLimitInterceptor, jwtHandshakeInterceptor)
        
        // TODO: [성능 최적화] 메시지 크기 제한 설정
        // .setHandshakeHandler(handshakeHandler)
        // .setMaxTextMessageBufferSize(65536)
        // .setMaxBinaryMessageBufferSize(65536)
        
        registry.addHandler(webRtcWebSocketHandler, wsPath)
                .addInterceptors(jwtHandshakeInterceptor)
                .setAllowedOrigins("*"); // 개발 환경용, 운영에서는 특정 도메인으로 제한 필요
    }
}
