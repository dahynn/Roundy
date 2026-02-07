package com.ssafya701.roundy.global.jwt;

import com.ssafya701.roundy.global.error.CustomException;
import com.ssafya701.roundy.global.error.ErrorEnum;
import com.ssafya701.roundy.auth.enums.UserRole;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Slf4j
@Component
public class JwtTokenProvider {

    private final Key key;
    private final UserDetailsService userDetailsService; // PrincipalDetailsService 주입됨
    private final long accessTokenValidTime;
    private final long refreshTokenValidTime = 14 * 24 * 60 * 60 * 1000L; // 14일

    public JwtTokenProvider(@Value("${jwt.secret}") String secretKey,
            @Value("${jwt.expiration-time}") long accessTokenValidTime,
            UserDetailsService userDetailsService) {
        byte[] keyBytes = Decoders.BASE64URL.decode(secretKey);
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.accessTokenValidTime = accessTokenValidTime;
        this.userDetailsService = userDetailsService;
    }

    // Access Token 생성 (30분)
    public String createAccessToken(Long userId, UserRole role) {
        Claims claims = Jwts.claims().setSubject(String.valueOf(userId));
        claims.put("role", role);
        Date now = new Date();

        return Jwts.builder()
                .setClaims(claims)
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + accessTokenValidTime))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    // Refresh Token 생성 (2주)
    public String createRefreshToken(Long userId) {
        Date now = new Date();
        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + refreshTokenValidTime))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    // 토큰 -> 인증 객체(Authentication) 변환
    public Authentication getAuthentication(String token) {
        // 토큰에서 ID 추출 -> DB 조회 -> UserDetails 생성
        UserDetails userDetails = userDetailsService.loadUserByUsername(getUserId(token).toString());
        return new UsernamePasswordAuthenticationToken(userDetails, "", userDetails.getAuthorities());
    }

    // 유저 ID 추출
    public Long getUserId(String token) {
        return Long.parseLong(Jwts.parserBuilder().setSigningKey(key).build()
                .parseClaimsJws(token).getBody().getSubject());
    }

    // 토큰 검증
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (io.jsonwebtoken.security.SecurityException | MalformedJwtException e) {
            throw new CustomException(ErrorEnum.INVALID_TOKEN_SIGNATURE);
        } catch (ExpiredJwtException e) {
            throw new CustomException(ErrorEnum.TOKEN_EXPIRATION);
        } catch (UnsupportedJwtException e) {
            throw new CustomException(ErrorEnum.INVALID_TOKEN);
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorEnum.FALSE_TOKEN);
        }
    }

    // 만료 시간 조회
    public long getExpirationTime() {
        return accessTokenValidTime;
    }
}