package com.ssafya701.roundy.verification.service;

import com.ssafya701.roundy.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VerificationServiceTest {

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private UserRepository userRepository;

    private VerificationService verificationService;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        verificationService = new VerificationService(redisTemplate, userRepository);
        ReflectionTestUtils.setField(verificationService, "ttlSeconds", 300);
    }

    @Test
    void startVerificationStoresPendingWithoutIncrementingRateLimitAgain() {
        verificationService.startVerification(7L, "request-1");

        verify(valueOperations).set("verify:request-1", "PENDING", 300L, TimeUnit.SECONDS);
        verify(valueOperations, never()).increment(anyString());
    }

    @Test
    void updateVerificationStatusReplacesPendingWithVerified() {
        when(valueOperations.get("verify:request-1")).thenReturn("PENDING");

        verificationService.updateVerificationStatus("request-1", true);

        verify(valueOperations).set("verify:request-1", "VERIFIED", 300L, TimeUnit.SECONDS);
    }

    @Test
    void updateVerificationStatusIgnoresAlreadyCompletedRequest() {
        when(valueOperations.get("verify:request-1")).thenReturn("VERIFIED");

        verificationService.updateVerificationStatus("request-1", false);

        verify(valueOperations, never()).set("verify:request-1", "FAILED", 300L, TimeUnit.SECONDS);
    }

    @Test
    void verifyAndDeleteRejectsMissingRequestIdWithoutRedisAccess() {
        assertThat(verificationService.verifyAndDelete(null)).isFalse();
        assertThat(verificationService.verifyAndDelete(" ")).isFalse();

        verify(valueOperations, never()).getAndDelete(anyString());
    }
}
