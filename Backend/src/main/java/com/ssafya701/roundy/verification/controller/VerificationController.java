package com.ssafya701.roundy.verification.controller;

import com.ssafya701.roundy.global.common.CommonResponse;
import com.ssafya701.roundy.global.jwt.JwtTokenProvider;
import com.ssafya701.roundy.verification.dto.request.VerificationCallbackRequest;
import com.ssafya701.roundy.verification.dto.request.VerificationPrepareRequest;
import com.ssafya701.roundy.verification.dto.response.VerificationPrepareResponse;
import com.ssafya701.roundy.verification.service.VerificationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

/**
 * Face Verification API Controller
 * AI 서버가 호출하는 API (IP 화이트리스트 검증)
 */
@Slf4j
@RestController
@RequestMapping("/api/verification")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationService verificationService;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${verification.ai-server-ips}")
    private String aiServerIps;

    /**
     * API 1: AI → BE 비교 이미지 URL 요청
     * 다이어그램 ③~⑦번
     * 
     * @param jwt     Client의 JWT (AI가 전달)
     * @param request requestId (AI가 생성한 UUID)
     * @return 사용자 검증 이미지 URL
     */
    @PostMapping("/prepare")
    public ResponseEntity<CommonResponse<VerificationPrepareResponse>> prepareVerification(
            HttpServletRequest httpRequest,
            @RequestHeader("Authorization") String jwt,
            @RequestBody VerificationPrepareRequest request) {

        // 1. AI 서버 IP 검증
        validateAiServerIp(httpRequest);

        // 2. JWT에서 userId 추출 (Bearer 제거)
        String token = jwt.replace("Bearer ", "");
        jwtTokenProvider.validateToken(token);
        Long userId = jwtTokenProvider.getUserId(token);

        log.info("Verification prepare request: requestId={}, userId={}", request.getRequestId(), userId);

        // 3. Rate Limiting + Redis PENDING 저장 (다이어그램 ⑥번)
        verificationService.startVerification(userId, request.getRequestId());

        // 4. DB에서 이미지 URL 조회 (캐싱 적용) (다이어그램 ⑤번)
        String imageUrl = verificationService.getVerificationImageUrl(userId);

        // 5. 이미지 URL 응답 (다이어그램 ⑦번)
        VerificationPrepareResponse response = new VerificationPrepareResponse(imageUrl);
        return ResponseEntity.ok(CommonResponse.ofSuccess(response));
    }

    /**
     * API 2: AI → BE 검증 결과 콜백 (동기 처리)
     * 다이어그램 ⑨~⑪번
     * 
     * @param request requestId + success (검증 결과)
     * @return 200 OK (AI는 이 응답을 받은 후 Client에게 전달)
     */
    @PostMapping("/callback")
    public ResponseEntity<CommonResponse<Void>> handleVerificationCallback(
            HttpServletRequest httpRequest,
            @RequestBody VerificationCallbackRequest request) {

        // 1. AI 서버 IP 검증
        validateAiServerIp(httpRequest);

        log.info("Verification callback: requestId={}, success={}",
                request.getRequestId(), request.isSuccess());

        // 2. Redis 상태 업데이트 PENDING → VERIFIED/FAILED (다이어그램 ⑩번)
        verificationService.updateVerificationStatus(request.getRequestId(), request.isSuccess());

        // 3. 200 OK 응답 (다이어그램 ⑪번)
        // AI는 이 응답을 받은 후에야 Client에게 성공 신호 전달
        return ResponseEntity.ok(CommonResponse.ofSuccess(null));
    }

    /**
     * AI 서버 IP 화이트리스트 검증
     */
    private void validateAiServerIp(HttpServletRequest request) {
        String clientIp = getClientIp(request);
        List<String> allowedIps = Arrays.asList(aiServerIps.split(","));

        if (!allowedIps.contains(clientIp)) {
            log.warn("Unauthorized IP access attempt: {}", clientIp);
            throw new SecurityException("허용되지 않은 IP입니다: " + clientIp);
        }

        log.debug("AI server IP validated: {}", clientIp);
    }

    /**
     * 실제 Client IP 추출 (프록시 고려)
     */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }
}
