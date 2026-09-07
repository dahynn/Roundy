package com.ssafya701.roundy.global.jwt;

import com.ssafya701.roundy.auth.enums.UserRole;
import com.ssafya701.roundy.auth.repository.UserRepository;
import com.ssafya701.roundy.global.error.CustomException;
import com.ssafya701.roundy.webrtc.config.JwtHandshakeInterceptor;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.socket.WebSocketHandler;
import java.util.HashMap;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AccessTokenBoundaryTest {
    private final JwtTokenProvider tokens = new JwtTokenProvider(
            java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[32]),
            60000, mock(UserDetailsService.class));

    @Test
    void existingAccessTokensRemainValidButRefreshTokensCannotActAsAccessTokens() {
        for (UserRole role : UserRole.values()) {
            assertThat(tokens.validateAccessToken(tokens.createAccessToken(1L, role))).isTrue();
        }
        String refresh = tokens.createRefreshToken(1L);
        assertThat(tokens.validateToken(refresh)).isTrue(); // 재발급 경로의 검증은 유지
        assertThatThrownBy(() -> tokens.validateAccessToken(refresh)).isInstanceOf(CustomException.class);
    }

    @Test
    void refreshTokenInBearerHeaderNeverReachesTheController() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/session/status");
        request.addHeader("Authorization", "Bearer " + tokens.createRefreshToken(1L));
        var response = new MockHttpServletResponse();
        var chain = mock(FilterChain.class);
        new JwtAuthenticationFilter(tokens).doFilter(request, response, chain);
        assertThat(response.getStatus()).isEqualTo(401);
        verifyNoInteractions(chain);
    }

    @Test
    @SuppressWarnings("unchecked")
    void refreshTokenCannotOpenAWebSocket() throws Exception {
        var users = mock(UserRepository.class);
        var redis = mock(RedisTemplate.class);
        var request = new MockHttpServletRequest("GET", "/ws/rotation");
        request.setQueryString("token=" + tokens.createRefreshToken(1L));
        var interceptor = new JwtHandshakeInterceptor(tokens, users, redis);
        boolean allowed = interceptor.beforeHandshake(new ServletServerHttpRequest(request),
                new ServletServerHttpResponse(new MockHttpServletResponse()), mock(WebSocketHandler.class), new HashMap<>());
        assertThat(allowed).isFalse();
        verifyNoInteractions(users, redis);
    }
}
