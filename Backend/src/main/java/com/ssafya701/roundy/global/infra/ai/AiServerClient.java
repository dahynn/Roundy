package com.ssafya701.roundy.global.infra.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
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
     * @return 검증 결과 (true: 일치, false: 불일치)
     */
    public boolean verifyFace(MultipartFile realtimeImage, InputStream originalImage) {
        try {
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("realtimeImage", realtimeImage.getResource());
            // InputStream의 경우 파일명이 필요하므로 익명 클래스로 오버라이드
            builder.part("originalImage", new InputStreamResource(originalImage) {
                @Override
                public String getFilename() {
                    return "original_image.jpg";
                }
            });

            log.info("Calling AI server verification via WebClient...");

            Map response = webClient.post()
                    .uri("/verify")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(10)) // 타임아웃 10초
                    .block();

            if (response == null) {
                log.error("AI server response is null");
                return false;
            }

            boolean verified = Boolean.TRUE.equals(response.get("success"));
            Object confidence = response.get("confidence");
            
            log.info("AI verification result: verified={}, confidence={}", verified, confidence);
            
            return verified;

        } catch (Exception e) {
            log.error("AI server call failed", e);
            throw new RuntimeException("AI 서버 호출 실패: " + e.getMessage(), e);
        }
    }
}
