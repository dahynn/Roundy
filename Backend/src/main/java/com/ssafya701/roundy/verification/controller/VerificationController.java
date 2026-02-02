package com.ssafya701.roundy.verification.controller;

import com.ssafya701.roundy.global.common.CommonResponse;
import com.ssafya701.roundy.global.jwt.JwtTokenProvider;
import com.ssafya701.roundy.verification.service.VerificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Face Verification API Controller
 * Client → Backend → AI 검증 플로우
 */
@Slf4j
@RestController
@RequestMapping("/api/verification")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationService verificationService;
    private final JwtTokenProvider jwtTokenProvider;
    private final com.ssafya701.roundy.global.infra.minio.MinioService minioService;
    private final com.ssafya701.roundy.global.infra.ai.AiServerClient aiServerClient;

    @Value("${verification.ai-server-ips}")
    private String aiServerIps;



    /**
     * API 3: Client → Backend 검증 요청 (새 구조)
     * 다이어그램 ①~⑪번
     *
     * @param jwt           Client의 JWT
     * @param realtimeImage 실시간 이미지
     * @return 검증 결과 (requestId + verified)
     */
    @PostMapping("/verify")
    public ResponseEntity<CommonResponse<com.ssafya701.roundy.verification.dto.response.VerificationResponse>> verify(
            @RequestHeader("Authorization") String jwt,
            @RequestParam("realtimeImage") org.springframework.web.multipart.MultipartFile realtimeImage) {

        // 1. JWT 검증 및 userId 추출
        String token = jwt.replace("Bearer ", "");
        jwtTokenProvider.validateToken(token);
        Long userId = jwtTokenProvider.getUserId(token);

        log.info("Verification request: userId={}", userId);

        // 2. Rate Limiting 체크
        verificationService.checkRateLimit(userId);

        // 3. requestId 생성
        String requestId = java.util.UUID.randomUUID().toString();

        // 4. Redis PENDING 저장
        verificationService.startVerification(userId, requestId);

        try {
            // 5. MinIO에서 원본 이미지 조회
            java.io.InputStream originalImage = minioService.downloadImage(userId, "verification");

            // 6. AI 검증 요청 (동기, 5~10초 대기)
            com.ssafya701.roundy.global.infra.ai.AiVerificationResult result = 
                    aiServerClient.verifyFace(realtimeImage, originalImage);

            // 얼굴 감지 실패 시 에러 응답
            if (result.hasFaceDetectionError()) {
                log.warn("Face detection failed: userId={}, error={}", userId, result.getErrorMessage());
                
                com.ssafya701.roundy.verification.dto.response.VerificationResponse errorResponse =
                        new com.ssafya701.roundy.verification.dto.response.VerificationResponse(
                                requestId, false
                        );
                
                return ResponseEntity.status(400)
                        .body(CommonResponse.ofFailure(result.getErrorMessage()));
            }

            // 7. Redis 상태 업데이트
            verificationService.updateVerificationStatus(requestId, result.isVerified());

            log.info("Verification completed: userId={}, requestId={}, verified={}",
                    userId, requestId, result.isVerified());

            // 8. 응답
            com.ssafya701.roundy.verification.dto.response.VerificationResponse response =
                    new com.ssafya701.roundy.verification.dto.response.VerificationResponse(
                            requestId, result.isVerified()
                    );

            return ResponseEntity.ok(CommonResponse.ofSuccess(response));

        } catch (UnsupportedOperationException e) {
            // AI 서버 주소 미확정 시
            log.warn("AI server not configured: {}", e.getMessage());
            
            // 임시 응답 (AI 주소 확정 전까지)
            com.ssafya701.roundy.verification.dto.response.VerificationResponse tempResponse =
                    new com.ssafya701.roundy.verification.dto.response.VerificationResponse(
                            requestId, false
                    );
            return ResponseEntity.status(503).body(CommonResponse.ofSuccess(tempResponse));
            
        } catch (Exception e) {
            log.error("Verification failed: userId={}, requestId={}", userId, requestId, e);
            
            // 에러 응답
            com.ssafya701.roundy.verification.dto.response.VerificationResponse errorResponse =
                    new com.ssafya701.roundy.verification.dto.response.VerificationResponse(
                            requestId, false
                    );
            return ResponseEntity.status(500).body(CommonResponse.ofSuccess(errorResponse));
        }
    }


    /**
     * 내 검증용 사진 URL 조회
     * GET /api/verification/verify
     */
    @GetMapping("/verify")
    public ResponseEntity<CommonResponse<com.ssafya701.roundy.verification.dto.response.VerificationImageResponse>> getVerificationPhoto(
            @RequestHeader("Authorization") String jwt) {
        
        String token = jwt.replace("Bearer ", "");
        jwtTokenProvider.validateToken(token);
        Long userId = jwtTokenProvider.getUserId(token);

        // MinIO에서 URL 생성
        String verificationImgUrl = minioService.getImageUrl(userId, "verification");
        
        return ResponseEntity.ok(CommonResponse.ofSuccess(
                new com.ssafya701.roundy.verification.dto.response.VerificationImageResponse(verificationImgUrl)
        ));
    }
}
