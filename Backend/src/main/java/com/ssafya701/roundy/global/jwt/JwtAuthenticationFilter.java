package com.ssafya701.roundy.global.jwt;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    // 필터를 적용하지 않을 경로 목록
    private static final List<String> EXCLUDE_PATHS = Arrays.asList(

            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            // 개발/테스트용 경로
            "/test/**",
            "/api/test/**",
            "/ws/**",
            "/api/webrtc/test/**");

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String requestURI = request.getRequestURI();
        return EXCLUDE_PATHS.stream().anyMatch(p -> pathMatcher.match(p, requestURI));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String token = resolveToken(request);

        // 유효한 토큰이라면
        if (token != null && jwtTokenProvider.validateToken(token)) {
            // 토큰으로 인증 객체(Authentication)를 만듬 (DB 조회 발생)
            Authentication authentication = jwtTokenProvider.getAuthentication(token);

            // SecurityContext에 저장 (이래야 컨트롤러에서 @AuthenticationPrincipal 사용 가능)
            SecurityContextHolder.getContext().setAuthentication(authentication);

            log.info("🔑 Security Context Set - UserID: {}, URI: {}", authentication.getName(),
                    request.getRequestURI());
        } else {
            log.info("⚠️ No valid token found for URI: {}", request.getRequestURI());
        }

        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
