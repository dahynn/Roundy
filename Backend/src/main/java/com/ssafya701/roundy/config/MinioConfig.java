package com.ssafya701.roundy.config;

import io.minio.MinioClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * MinIO 클라이언트 설정
 * - S3 호환 객체 스토리지
 * - 사용자 프로필 이미지, 인증 사진 저장용
 */
@Slf4j
@Configuration
public class MinioConfig {

    @Value("${minio.url}")
    private String url;

    @Value("${minio.external-url}")
    private String externalUrl;

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    @Bean
    public MinioClient minioClient() {
        log.info("Initializing Internal MinIO client: url={}", url);
        return MinioClient.builder()
                .endpoint(stripPath(url))
                .credentials(accessKey, secretKey)
                .region("us-east-1")
                .build();
    }

    @Bean
    public MinioClient externalMinioClient() {
        String targetUrl = (externalUrl != null && !externalUrl.isEmpty()) ? externalUrl : url;
        log.info("Initializing External MinIO client for Presigned URLs: url={}", targetUrl);
        return MinioClient.builder()
                .endpoint(stripPath(targetUrl))
                .credentials(accessKey, secretKey)
                .region("us-east-1")
                .build();
    }

    /**
     * URL에서 경로 부분을 제거하여 MinioClient가 수용 가능한 형태로 변환합니다.
     * 예: https://example.com/minio -> https://example.com
     */
    private String stripPath(String urlString) {
        if (urlString == null || urlString.isEmpty())
            return urlString;
        try {
            java.net.URI uri = new java.net.URI(urlString);
            return new java.net.URI(uri.getScheme(), uri.getAuthority(), null, null, null).toString();
        } catch (Exception e) {
            log.warn("Failed to strip path from URL: {}, using as is.", urlString);
            return urlString;
        }
    }
}
