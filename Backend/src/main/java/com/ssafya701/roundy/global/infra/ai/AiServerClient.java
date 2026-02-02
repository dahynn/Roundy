package com.ssafya701.roundy.global.infra.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.InputStream;
import java.time.Duration;
import java.util.Map;

/**
 * AI 서버 클라이언트
 * - 얼굴 검증 요청 (Backend -> AI Server)
 * - WebClient 사용 (Non-blocking I/O)
 */
@Slf4j
@Component
public class AiServerClient {

    private final WebClient webClient;

    public AiServerClient(@Value("${ai.server.url}") String aiServerUrl, WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl(aiServerUrl)
                .build();
    }

    /**
     * 얼굴 검증 요청
     *
     * @param realtimeImage 실시간 이미지 (MultipartFile)
     * @param originalImage 원본 이미지 (InputStream from MinIO)
     * @return 검증 결과 (verified + errorMessage)
     */
    public AiVerificationResult verifyFace(MultipartFile realtimeImage, InputStream originalImage) {
        try {
            // InputStream을 byte[]로 변환하여 Content-Length 제공 (Chunked Encoding 방지)
            byte[] originalImageBytes = originalImage.readAllBytes();
            
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("realtimeImage", realtimeImage.getResource());
            builder.part("originalImage", new org.springframework.core.io.ByteArrayResource(originalImageBytes) {
                @Override
                public String getFilename() {
                    return "original_image.jpg";
                }
            });


            log.info("Calling AI server verification via WebClient...");

            Map<String, Object> response = webClient.post()
                    .uri("/verify")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {})
                    .timeout(Duration.ofSeconds(30)) // 타임아웃 30초 (GPU 초기화 고려)
                    .block();


            if (response == null) {
                log.error("AI server response is null");
                return AiVerificationResult.faceDetectionError("AI 서버 응답 없음");
            }

            // AI 서버 응답에서 error 필드가 있으면 얼굴 감지 실패
            if (response.containsKey("error")) {
                String errorMessage = (String) response.get("error");
                log.warn("AI server returned error: {}", errorMessage);
                return AiVerificationResult.faceDetectionError(errorMessage);
            }

            // verified 필드 확인 (success가 아님!)
            boolean verified = Boolean.TRUE.equals(response.get("verified"));
            Object distance = response.get("distance");
            
            log.info("AI verification result: verified={}, distance={}", verified, distance);
            
            return AiVerificationResult.success(verified);

        } catch (Exception e) {
            log.error("AI server call failed", e);
            return AiVerificationResult.faceDetectionError("AI 서버 호출 실패: " + e.getMessage());
        }
    }
}
