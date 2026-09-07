package com.ssafya701.roundy.verification.service;

import com.ssafya701.roundy.global.error.CustomException;
import com.ssafya701.roundy.global.error.ErrorEnum;
import com.ssafya701.roundy.global.exception.TooManyRequestsException;
import com.ssafya701.roundy.global.exception.VerificationNotFoundException;
import com.ssafya701.roundy.auth.entity.User;
import com.ssafya701.roundy.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.List;
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
    private static final DefaultRedisScript<Long> COMPLETE_SCRIPT = new DefaultRedisScript<>("""
            if redis.call('GET', KEYS[1]) ~= 'PENDING' then return 0 end
            redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
            return 1
            """, Long.class);
    private static final DefaultRedisScript<Long> CONSUME_SCRIPT = new DefaultRedisScript<>("""
            if redis.call('GET', KEYS[1]) ~= 'VERIFIED' then return 0 end
            redis.call('DEL', KEYS[1])
            return 1
            """, Long.class);

    /**
     * 검증 시작 (다이어그램 ⑥번)
     * Redis에 PENDING 상태 저장
     * Rate Limiting은 요청 진입점에서 한 번만 확인한다.
     */
    public void startVerification(Long userId, String requestId) {
        // Redis에 PENDING 상태 저장
        String key = verificationKey(userId, requestId);
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
     * PENDING 상태인 요청만 완료 상태로 전환한다.
     */
    public void updateVerificationStatus(Long userId, String requestId, boolean success) {
        String key = verificationKey(userId, requestId);
        String newStatus = success ? STATUS_VERIFIED : STATUS_FAILED;

        Long changed = redisTemplate.execute(COMPLETE_SCRIPT, List.of(key), newStatus, String.valueOf(ttlSeconds));
        if (!Long.valueOf(1).equals(changed)) {
            log.warn("Verification result ignored: userId={}, requestId={}", userId, requestId);
            return;
        }

        log.info("Verification status updated: requestId={}, status={}", requestId, newStatus);
    }

    /**
     * 검증 상태 확인 (다이어그램 ⑭번)
     * Client가 큐 진입 시 호출
     */
    public String checkVerificationStatus(Long userId, String requestId) {
        String key = verificationKey(userId, requestId);
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
    public void deleteVerificationRecord(Long userId, String requestId) {
        String key = verificationKey(userId, requestId);
        Boolean deleted = redisTemplate.delete(key);

        if (Boolean.TRUE.equals(deleted)) {
            log.info("Verification record deleted: requestId={}", requestId);
        }
    }

    /**
     * 검증 상태 확인하고 동시에 삭제
     * 같은 requestId로 중복 입장 불가
     * 본인 소유의 VERIFIED 상태만 원자적으로 소비한다. PENDING/FAILED는 보존한다.
     */
    public boolean verifyAndDelete(Long userId, String requestId) {
        if (userId == null || requestId == null || requestId.isBlank()) {
            log.warn("Verification requestId is missing");
            return false;
        }

        String key = verificationKey(userId, requestId);
        boolean isVerified = Long.valueOf(1).equals(redisTemplate.execute(CONSUME_SCRIPT, List.of(key)));
        log.info("Verification checked and deleted: requestId={}, verified={}", requestId, isVerified);

        return isVerified;
    }

    /**
     * 검증 상태가 VERIFIED인지 확인
     */
    public boolean isVerified(Long userId, String requestId) {
        String status = checkVerificationStatus(userId, requestId);
        return STATUS_VERIFIED.equals(status);
    }

    private String verificationKey(Long userId, String requestId) {
        return VERIFICATION_KEY_PREFIX + Objects.requireNonNull(userId) + ":" + Objects.requireNonNull(requestId);
    }
}
