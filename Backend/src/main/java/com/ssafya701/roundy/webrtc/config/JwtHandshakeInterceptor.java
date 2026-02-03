package com.ssafya701.roundy.webrtc.config;

import com.ssafya701.roundy.global.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * WebSocket 핸드셰이크 시 JWT 토큰을 검증하는 인터셉터
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) throws Exception {

        /* 
         * [테스트용 수정] 
         * 클라이언트에서 ?userId=123&username=Bob&gender=MALE&mode=PAIR_ONLY 형태로 접속하면
         * JWT 검증을 건너뛰고 해당 정보로 세션을 생성합니다.
         */
        
        String query = request.getURI().getQuery();
        
        // 1. 테스트 파라미터 확인 (userId가 있으면 테스트 모드 진입)
        String userIdParam = extractQueryParam(query, "userId");
        if (userIdParam != null) {
            String usernameParam = extractQueryParam(query, "username");
            String genderParam = extractQueryParam(query, "gender");
            String modeParam = extractQueryParam(query, "mode");
            
            Long userId = Long.parseLong(userIdParam);
            String username = usernameParam != null ? usernameParam : "TestUser" + userId;
            String gender = genderParam != null ? genderParam : "MALE";
            String mode = modeParam != null ? modeParam : "FREE_TALK";
            
            attributes.put("userId", userId);
            attributes.put("username", username);
            attributes.put("gender", gender);
            attributes.put("mode", mode);
            
            log.warn("🔓 [테스트 모드] JWT SKIP - userId={}, username={}, gender={}", userId, username, gender);
            return true;
        }

        /* 원래 JWT 검증 로직 */
         if (query == null) {
            log.warn("WebSocket 연결 실패: 쿼리 파라미터 없음");
            return false;
        }

        // token 파라미터 추출
        String token = extractToken(query);
        if (token == null) {
            log.warn("WebSocket 연결 실패: token 파라미터 없음");
            return false;
        }

        try {
            // JWT 토큰 검증
            if (!jwtTokenProvider.validateToken(token)) {
                log.warn("WebSocket 연결 실패: JWT 토큰 검증 실패");
                return false;
            }

            // 사용자 ID 추출
            Long userId = jwtTokenProvider.getUserId(token);
            
            if (userId == null) {
                log.warn("WebSocket 연결 실패: JWT에 userId 없음");
                return false;
            }

            // 사용자 정보를 WebSocket 세션 속성에 저장
            attributes.put("userId", userId);
            attributes.put("username", String.valueOf(userId)); // username은 userId로 대체
            
            // TODO: 실제 서비스에서는 DB에서 Gender, Nickname 등을 조회해서 넣어야 함
            // 임시: 기본값 설정
            attributes.put("gender", "MALE"); 
            attributes.put("mode", "FREE_TALK");

            log.info("WebSocket 핸드셰이크 성공: userId={}", userId);
            return true;

        } catch (Exception e) {
            log.warn("WebSocket 연결 실패: JWT 검증 실패 - {}", e.getMessage());
            return false;
        }
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception) {
        // 핸드셰이크 이후 처리 (필요시 구현)
    }

    private String extractToken(String query) {
        String[] params = query.split("&");
        for (String param : params) {
            String[] keyValue = param.split("=", 2);
            if (keyValue.length == 2 && "token".equals(keyValue[0])) {
                return keyValue[1];
            }
        }
        return null;
    }
    
    // 테스트용: 범용 쿼리 파라미터 추출 메소드
    private String extractQueryParam(String query, String paramName) {
        if (query == null) return null;
        String[] params = query.split("&");
        for (String param : params) {
            String[] keyValue = param.split("=", 2);
            if (keyValue.length == 2 && paramName.equals(keyValue[0])) {
                return keyValue[1];
            }
        }
        return null;
    }
}
