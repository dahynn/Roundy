package com.ssafya701.roundy.webrtc.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * 테스트용 JWT 토큰 생성 유틸리티
 */
public class TestJwtGenerator {

    private static final String DEFAULT_SECRET = "test-secret-key-for-webrtc-development-minimum-32-bytes";
    private final SecretKey secretKey;

    public TestJwtGenerator() {
        this(DEFAULT_SECRET);
    }

    public TestJwtGenerator(String secret) {
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

        return Jwts.builder()
                .subject(username)
                .claim("userId", userId)
                .issuedAt(now)
                .expiration(validity)
                .signWith(secretKey)
                .compact();
    }

    /**
     * 만료된 JWT 토큰 생성 (테스트용)
     * 
     * @param userId 사용자 ID
     * @param username 사용자 이름
     * @return 만료된 JWT 토큰
     */
    public String generateExpiredToken(Long userId, String username) {
        Date now = new Date();
        Date expiredDate = new Date(now.getTime() - 1000); // 1초 전에 만료

        return Jwts.builder()
                .subject(username)
                .claim("userId", userId)
                .issuedAt(new Date(now.getTime() - 2000))
                .expiration(expiredDate)
                .signWith(secretKey)
                .compact();
    }

    /**
     * 잘못된 서명의 JWT 토큰 생성 (테스트용)
     * 
     * @param userId 사용자 ID
     * @param username 사용자 이름
     * @return 잘못된 서명의 JWT 토큰
     */
    public String generateInvalidSignatureToken(Long userId, String username) {
        SecretKey wrongKey = Keys.hmacShaKeyFor("wrong-secret-key-for-testing-purpose-32bytes".getBytes(StandardCharsets.UTF_8));
        
        Date now = new Date();
        Date validity = new Date(now.getTime() + 3600000);

        return Jwts.builder()
                .subject(username)
                .claim("userId", userId)
                .issuedAt(now)
                .expiration(validity)
                .signWith(wrongKey)
                .compact();
    }
}
