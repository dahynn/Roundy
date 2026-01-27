package com.ssafya701.roundy.webrtc.service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 토큰 생성 및 검증 서비스
 */
@Slf4j
@Service
public class JwtService {

    private final SecretKey secretKey;

    public JwtService(@Value("${jwt.secret:test-secret-key-for-webrtc-development-minimum-32-bytes}") String secret) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * JWT 토큰 생성
     * 
     * @param userId 사용자 ID
     * @param username 사용자 이름
     * @return JWT 토큰 문자열
     */
    public String generateToken(Long userId, String username) {
        // TODO: [브랜치 병합] 기존 AuthService와 통합
        // return authService.createAccessToken(userId, username);
        return generateToken(userId, username, 3600000); // 1시간
    }

    /**
     * JWT 토큰 생성 (만료 시간 지정)
     * 
     * @param userId 사용자 ID
     * @param username 사용자 이름
     * @param validityMs 유효 시간 (밀리초)
     * @return JWT 토큰 문자열
     */
    public String generateToken(Long userId, String username, long validityMs) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + validityMs);

        String token = Jwts.builder()
                .subject(username)
                .claim("userId", userId)
                .issuedAt(now)
                .expiration(validity)
                .signWith(secretKey)
                .compact();

        log.debug("JWT 토큰 생성: userId={}, username={}, validityMs={}", userId, username, validityMs);
        return token;
    }

    /**
     * 개발/테스트용 임시 토큰 생성
     * 실제 운영 환경에서는 사용자 인증 후 호출되어야 함
     * 
     * @param userId 사용자 ID
     * @param username 사용자 이름
     * @return JWT 토큰 문자열
     */
    // TODO: [운영 환경] @Profile({"dev", "local"}) 추가하여 운영에서 비활성화
    public String generateTempToken(Long userId, String username) {
        log.warn("임시 JWT 토큰 생성 (개발/테스트용): userId={}, username={}", userId, username);
        // TODO: [운영 환경] 토큰 만료 시간을 환경별로 설정 (dev: 24h, prod: 1h)
        return generateToken(userId, username, 86400000); // 24시간
    }
}
