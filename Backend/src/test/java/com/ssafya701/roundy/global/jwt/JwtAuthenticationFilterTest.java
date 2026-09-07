package com.ssafya701.roundy.global.jwt;

import com.ssafya701.roundy.global.error.CustomException;
import com.ssafya701.roundy.global.error.ErrorEnum;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtAuthenticationFilterTest {
    @AfterEach
    void clearContext() { SecurityContextHolder.clearContext(); }

    @Test
    void controllerFailureNeverExecutesTheRequestTwice() throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/session/enter");
        var response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);
        ServletException failure = new ServletException("downstream failure");
        doThrow(failure).when(chain).doFilter(request, response);
        var filter = new JwtAuthenticationFilter(mock(JwtTokenProvider.class));

        assertThatThrownBy(() -> filter.doFilter(request, response, chain)).isSameAs(failure);
        verify(chain, times(1)).doFilter(request, response);
    }

    @Test
    void businessExceptionIsNotMisreportedAsAnAuthenticationFailure() throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/session/enter");
        var response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);
        var failure = new CustomException(ErrorEnum.INVALID_INPUT);
        doThrow(failure).when(chain).doFilter(request, response);
        var filter = new JwtAuthenticationFilter(mock(JwtTokenProvider.class));
        assertThatThrownBy(() -> filter.doFilter(request, response, chain)).isSameAs(failure);
        assertThat(response.getStatus()).isNotEqualTo(401);
    }

    @Test
    void expiredTokenReturns401WithoutExecutingTheController() throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/session/enter");
        request.addHeader("Authorization", "Bearer test-expired");
        var response = new MockHttpServletResponse();
        var provider = mock(JwtTokenProvider.class);
        when(provider.validateAccessToken("test-expired")).thenThrow(new CustomException(ErrorEnum.TOKEN_EXPIRATION));
        FilterChain chain = mock(FilterChain.class);
        new JwtAuthenticationFilter(provider).doFilter(request, response, chain);
        assertThat(response.getStatus()).isEqualTo(401);
        verifyNoInteractions(chain);
    }
}
