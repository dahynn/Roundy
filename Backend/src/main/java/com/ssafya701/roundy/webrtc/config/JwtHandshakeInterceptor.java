package com.ssafya701.roundy.webrtc.config;

import com.ssafya701.roundy.auth.entity.User;
import com.ssafya701.roundy.auth.repository.UserRepository;
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
    private final UserRepository userRepository;
    private final org.springframework.data.redis.core.RedisTemplate<String, String> redisTemplate;

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
            String mode = modeParam != null ? modeParam : "PAIR_ONLY";
            
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

            // DB에서 실제 유저 정보 조회
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다. userId=" + userId));

            // 사용자 정보를 WebSocket 세션 속성에 저장
            attributes.put("userId", userId);
            
            // 닉네임 설정 (없으면 이름 사용)
            String nickname = user.getNickName();
            if (nickname == null || nickname.isEmpty()) {
                nickname = user.getName();
            }
            attributes.put("username", nickname);
            
            // 성별 설정
            if (user.getGender() != null) {
                attributes.put("gender", user.getGender().name());
            } else {
                log.warn("사용자 성별 정보 없음: userId={}", userId);
                attributes.put("gender", "UNKNOWN");
            }
            
            // 모드는 기본값 PAIR_ONLY (소개팅 모드)
            attributes.put("mode", "PAIR_ONLY");

            // [추가] Redis에서 유저의 할당된 방(roomId) 조회
            // Session API 매칭 시 'user:{userId}:currentRoom' 키가 생성됨
            String userRoomKey = "user:" + userId + ":currentRoom";
            String roomId = redisTemplate.opsForValue().get(userRoomKey);

            if (roomId == null) {
                log.warn("❌ WebSocket 연결 실패: 배정된 방 없음 - userId={}", userId);
                return false;
            }
            
            // 방 멤버 권한 재확인 (방어적 코드)
            String memberKey = "room:" + roomId + ":member:" + userId;
            if (Boolean.FALSE.equals(redisTemplate.hasKey(memberKey))) {
                 log.warn("❌ WebSocket 연결 실패: 방 입장 권한 없음 (System Error) - userId={}, roomId={}", 
                         userId, roomId);
                return false;
            }

            attributes.put("roomId", roomId);

            log.info("WebSocket 핸드셰이크 성공: userId={}, roomId={}, nickName={}, gender={}", 
                    userId, roomId, nickname, attributes.get("gender"));
            return true;

        } catch (Exception e) {
            log.warn("WebSocket 연결 실패: {} - {}", e.getClass().getSimpleName(), e.getMessage());
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
