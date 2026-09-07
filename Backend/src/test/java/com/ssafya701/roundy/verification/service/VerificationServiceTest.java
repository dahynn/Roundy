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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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

        verify(valueOperations).set("verify:7:request-1", "PENDING", 300L, TimeUnit.SECONDS);
        verify(valueOperations, never()).increment(anyString());
    }

    @Test
    void updateVerificationStatusReplacesPendingWithVerified() {
        verificationService.updateVerificationStatus(7L, "request-1", true);
        verify(redisTemplate).execute(any(org.springframework.data.redis.core.script.RedisScript.class),
                eq(java.util.List.of("verify:7:request-1")), eq("VERIFIED"), eq("300"));
    }

    @Test
    void updateVerificationStatusIgnoresAlreadyCompletedRequest() {
        verificationService.updateVerificationStatus(7L, "request-1", false);
        verify(valueOperations, never()).set("verify:7:request-1", "FAILED", 300L, TimeUnit.SECONDS);
    }

    @Test
    void verifyAndDeleteRejectsMissingRequestIdWithoutRedisAccess() {
        assertThat(verificationService.verifyAndDelete(7L, null)).isFalse();
        assertThat(verificationService.verifyAndDelete(7L, " ")).isFalse();

        verify(valueOperations, never()).getAndDelete(anyString());
    }
}
