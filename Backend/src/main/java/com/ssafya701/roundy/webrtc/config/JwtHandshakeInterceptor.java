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

        // ========== 테스트용: JWT 검증 비활성화 ==========
        // TODO: 운영 배포 전 반드시 아래 주석 해제하고 테스트 코드 삭제할 것!
        
        String query = request.getURI().getQuery();
        
        // 테스트용: userId, username, gender를 쿼리 파라미터에서 직접 추출
        String userIdParam = extractQueryParam(query, "userId");
        String usernameParam = extractQueryParam(query, "username");
        String genderParam = extractQueryParam(query, "gender");
        
        Long userId = userIdParam != null ? Long.parseLong(userIdParam) : 1L;
        String username = usernameParam != null ? usernameParam : "testUser";
        String gender = genderParam != null ? genderParam : "MALE";  // 기본값: MALE
        
        attributes.put("userId", userId);
        attributes.put("username", username);
        attributes.put("gender", gender);  // gender 추가
        
        log.warn("🔓 [테스트 모드] JWT 검증 SKIP - userId={}, username={}, gender={}", userId, username, gender);
        return true;
        
        /* ========== 원래 JWT 검증 로직 (주석 처리) ==========
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

            log.info("WebSocket 핸드셰이크 성공: userId={}", userId);
            return true;

        } catch (Exception e) {
            log.warn("WebSocket 연결 실패: JWT 검증 실패 - {}", e.getMessage());
            return false;
        }
        ========== 원래 JWT 검증 로직 끝 ========== */
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
