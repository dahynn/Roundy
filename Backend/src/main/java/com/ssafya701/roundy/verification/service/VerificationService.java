package com.ssafya701.roundy.verification.service;

import com.ssafya701.roundy.global.error.CustomException;
import com.ssafya701.roundy.global.error.ErrorEnum;
import com.ssafya701.roundy.global.exception.TooManyRequestsException;
import com.ssafya701.roundy.global.exception.VerificationNotFoundException;
import com.ssafya701.roundy.user.entity.User;
import com.ssafya701.roundy.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.concurrent.TimeUnit;

// 검증 상태 관리 (Redis PENDING/VERIFIED/FAILED, Rate Limiting, Cache)
@Slf4j
@Service
@RequiredArgsConstructor
public class VerificationService {

    private final RedisTemplate<String, String> redisTemplate;
    private final UserRepository userRepository;

    @Value("${verification.ttl-seconds}")
    private int ttlSeconds;

    @Value("${verification.rate-limit-count}")
    private int rateLimitCount;

    @Value("${verification.rate-limit-period-seconds}")
    private int rateLimitPeriodSeconds;

    private static final String VERIFICATION_KEY_PREFIX = "verify:";
    private static final String RATE_LIMIT_KEY_PREFIX = "verify:rate:";
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_VERIFIED = "VERIFIED";
    private static final String STATUS_FAILED = "FAILED";

    /**
     * 검증 시작 (다이어그램 ⑥번)
     * Redis에 PENDING 상태 저장 + Rate Limiting 체크
     */
    public void startVerification(Long userId, String requestId) {
        // 1. Rate Limiting 체크
        checkRateLimit(userId);

        // 2. Redis에 PENDING 상태 저장 (TTL 30초)
        String key = VERIFICATION_KEY_PREFIX + requestId;
        redisTemplate.opsForValue().set(key, STATUS_PENDING, ttlSeconds, TimeUnit.SECONDS);

        log.info("Verification started: requestId={}, userId={}", requestId, userId);
    }

    /**
     * Rate Limiting 체크
     * 1분에 3회까지만 검증 요청 가능
     */
    public void checkRateLimit(Long userId) {
        String key = RATE_LIMIT_KEY_PREFIX + userId;
        Long attempts = redisTemplate.opsForValue().increment(key);

        // 첫 요청이면 TTL 설정 (60초)
        if (attempts == 1) {
            redisTemplate.expire(key, rateLimitPeriodSeconds, TimeUnit.SECONDS);
        }

        // 제한 초과 확인
        if (attempts > rateLimitCount) {
            log.warn("Rate limit exceeded: userId={}, attempts={}", userId, attempts);
            throw new TooManyRequestsException(
                    String.format("%d초에 %d회까지만 가능합니다", rateLimitPeriodSeconds, rateLimitCount)
            );
        }

        log.debug("Rate limit check passed: userId={}, attempts={}/{}", userId, attempts, rateLimitCount);
    }

    /**
     * User 검증 이미지 URL 조회 (다이어그램 ⑤번)
     * Spring Cache 적용 (1시간 캐싱)
     */
    @Cacheable(value = "userImage", key = "#userId")
    @Transactional(readOnly = true)
    public String getVerificationImageUrl(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorEnum.USER_NOT_FOUND));

        String imageUrl = user.getVerificationImageUrl();
        if (imageUrl == null || imageUrl.isEmpty()) {
            throw new CustomException(ErrorEnum.INVALID_INPUT);
        }

        log.info("Fetched verification image URL for userId={} (cached)", Objects.requireNonNull(userId));
        return imageUrl;
    }

    /**
     * 검증 상태 업데이트 (다이어그램 ⑩번)
     * AI 검증 완료 후 VERIFIED/FAILED 상태로 변경
     * SETNX 사용으로 중복 callback 방지 (첫 번째 결과만 유효)
     */
    public void updateVerificationStatus(String requestId, boolean success) {
        String key = VERIFICATION_KEY_PREFIX + requestId;
        String newStatus = success ? STATUS_VERIFIED : STATUS_FAILED;

        // SETNX: 키가 없을 때만 설정 (중복 callback 방지)
        Boolean wasSet = redisTemplate.opsForValue().setIfAbsent(
                key,
                newStatus,
                ttlSeconds,
                TimeUnit.SECONDS
        );

        if (Boolean.FALSE.equals(wasSet)) {
            log.warn("Duplicate callback ignored: requestId={}", requestId);
            return;
        }

        log.info("Verification status updated: requestId={}, status={}", requestId, newStatus);
    }

    /**
     * 검증 상태 확인 (다이어그램 ⑭번)
     * Client가 큐 진입 시 호출
     */
    public String checkVerificationStatus(String requestId) {
        String key = VERIFICATION_KEY_PREFIX + requestId;
        String status = redisTemplate.opsForValue().get(key);

        if (status == null) {
            log.warn("Verification record not found: requestId={}", requestId);
            throw new VerificationNotFoundException("검증 기록을 찾을 수 없거나 만료되었습니다.");
        }

        return status;
    }

    /**
     * 검증 기록 삭제 (재사용 방지)
     * Client가 큐 진입 성공 후 호출
     */
    public void deleteVerificationRecord(String requestId) {
        String key = VERIFICATION_KEY_PREFIX + requestId;
        Boolean deleted = redisTemplate.delete(key);

        if (Boolean.TRUE.equals(deleted)) {
            log.info("Verification record deleted: requestId={}", requestId);
        }
    }

    /**
     * 검증 상태 확인하고 동시에 삭제
     * 같은 requestId로 중복 입장 불가
     * Redis GETDEL 사용
     */
    public boolean verifyAndDelete(String requestId) {
        String key = VERIFICATION_KEY_PREFIX + requestId;

        // GETDEL: GET과 DELETE를 한 번에 수행
        String status = redisTemplate.opsForValue().getAndDelete(key);

        if (status == null) {
            log.warn("Verification record not found or already used: requestId={}", requestId);
            return false;
        }

        boolean isVerified = STATUS_VERIFIED.equals(status);
        log.info("Verification checked and deleted: requestId={}, verified={}", requestId, isVerified);

        return isVerified;
    }

    /**
     * 검증 상태가 VERIFIED인지 확인
     */
    public boolean isVerified(String requestId) {
        String status = checkVerificationStatus(requestId);
        return STATUS_VERIFIED.equals(status);
    }
}
