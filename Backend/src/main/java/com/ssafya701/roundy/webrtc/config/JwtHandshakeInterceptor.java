package com.ssafya701.roundy.webrtc.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * WebSocket 핸드셰이크 시 JWT 토큰을 검증하는 인터셉터
 */
@Slf4j
@Component
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final SecretKey secretKey;
    private final com.ssafya701.roundy.user.repository.UserRepository userRepository;

    public JwtHandshakeInterceptor(@Value("${jwt.secret:test-secret-key-for-webrtc-development-minimum-32-bytes}") String secret,
                                   com.ssafya701.roundy.user.repository.UserRepository userRepository) {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
        this.userRepository = userRepository;
    }

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) throws Exception {

        String query = request.getURI().getQuery();
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
            // TODO: [브랜치 병합] JwtService의 validateAndExtract() 메서드 활용
            // TokenInfo tokenInfo = jwtService.validateAndExtract(token);
            // attributes.put("userId", tokenInfo.getUserId());
            // attributes.put("username", tokenInfo.getUsername());
            
            // TODO: [보안 강화] 토큰 블랙리스트 체크
            // if (tokenBlacklistService.isBlacklisted(token)) {
            //     log.warn("WebSocket 연결 실패: 블랙리스트에 등록된 토큰");
            //     return false;
            // }
            
            // TODO: [보안 강화] Rate limiting 체크
            // String clientIp = getClientIp(request);
            // if (!rateLimiter.tryAcquire(clientIp)) {
            //     log.warn("WebSocket 연결 실패: Rate limit 초과, ip={}", clientIp);
            //     return false;
            // }

            // JWT 검증 및 파싱
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(secretKey)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            // JwtTokenProvider는 sub에 userId를 넣음
            String subject = claims.getSubject();
            if (subject == null) {
                 log.warn("WebSocket 연결 실패: JWT subject(userId) 없음");
                 return false;
            }
            
            Long userId = Long.parseLong(subject);

            // DB에서 유저 정보 조회 (username/nickname 확보)
            String username = userRepository.findById(userId)
                    .map(com.ssafya701.roundy.user.entity.User::getNickName)
                    .orElse("UnknownUser");

            attributes.put("userId", userId);
            attributes.put("username", username);

            log.info("WebSocket 핸드셰이크 성공: userId={}, username={}", userId, username);
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
        // 핸드셰이크 이후 처리
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
}
