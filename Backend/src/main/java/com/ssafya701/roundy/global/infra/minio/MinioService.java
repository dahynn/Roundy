package com.ssafya701.roundy.global.infra.minio;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;

/**
 * MinIO 이미지 관리 서비스
 * - 사용자 프로필 이미지 업로드/다운로드
 * - 인증 사진 업로드/다운로드
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MinioService {

    private final MinioClient minioClient;
    private final MinioClient externalMinioClient;

    private static final String BUCKET_NAME = "roundy";

    @Value("${minio.url}")
    private String minioUrl;

    @Value("${minio.external-url}")
    private String externalUrl;

    @jakarta.annotation.PostConstruct
    public void init() {
        if (minioUrl != null)
            minioUrl = minioUrl.trim();
        if (externalUrl != null)
            externalUrl = externalUrl.trim();
    }

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final java.util.List<String> ALLOWED_CONTENT_TYPES = java.util.Arrays.asList(
            "image/jpeg", "image/png", "image/webp");

    /**
     * 이미지 업로드
     *
     * @param userId 사용자 ID
     * @param file   업로드할 파일
     * @param type   이미지 타입 (profile, verification)
     * @return 업로드된 이미지 경로
     */
    public String uploadImage(Long userId, MultipartFile file, String type) {
        // 파일 검증
        validateFile(file);

        try {
            // 버킷 존재 확인
            ensureBucketExists();

            // 파일명 생성: user/{userId}/{type}.jpg
            String objectName = String.format("user/%d/%s.jpg", userId, type);

            // 업로드
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(BUCKET_NAME)
                            .object(objectName)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build());

            log.info("Image uploaded: userId={}, type={}, path={}", userId, type, objectName);
            return objectName;

        } catch (Exception e) {
            log.error("Failed to upload image: userId={}, type={}", userId, type, e);
            throw new RuntimeException("이미지 업로드 실패", e);
        }
    }

    /**
     * 파일 업로드 전 검증 (FileUploader 로직 이식)
     */
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new com.ssafya701.roundy.global.error.CustomException(
                    com.ssafya701.roundy.global.error.ErrorEnum.INVALID_INPUT);
        }

        // 1. 파일 크기 검증
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new com.ssafya701.roundy.global.error.CustomException(
                    com.ssafya701.roundy.global.error.ErrorEnum.FILE_SIZE_EXCEEDED);
        }

        // 2. MIME Type 검증
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new com.ssafya701.roundy.global.error.CustomException(
                    com.ssafya701.roundy.global.error.ErrorEnum.INVALID_FILE_TYPE);
        }

        // 3. 실제 이미지 검증 (매직 넘버)
        try (InputStream is = file.getInputStream()) {
            java.awt.image.BufferedImage image = javax.imageio.ImageIO.read(is);
            if (image == null) {
                throw new com.ssafya701.roundy.global.error.CustomException(
                        com.ssafya701.roundy.global.error.ErrorEnum.CORRUPTED_IMAGE);
            }

            // 압축 폭탄 방지
            if (image.getWidth() * image.getHeight() > 10000 * 10000) {
                throw new com.ssafya701.roundy.global.error.CustomException(
                        com.ssafya701.roundy.global.error.ErrorEnum.FILE_SIZE_EXCEEDED);
            }
        } catch (IOException e) {
            throw new com.ssafya701.roundy.global.error.CustomException(
                    com.ssafya701.roundy.global.error.ErrorEnum.CORRUPTED_IMAGE);
        }
    }

    /**
     * 이미지 다운로드 (AI 서버 전달용)
     *
     * @param userId 사용자 ID
     * @param type   이미지 타입
     * @return InputStream
     */
    public InputStream downloadImage(Long userId, String type) {
        try {
            String objectName = String.format("user/%d/%s.jpg", userId, type);

            InputStream stream = minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(BUCKET_NAME)
                            .object(objectName)
                            .build());

            log.info("Image downloaded: userId={}, type={}", userId, type);
            return stream;

        } catch (Exception e) {
            log.error("Failed to download image: userId={}, type={}", userId, type, e);
            throw new RuntimeException("이미지 다운로드 실패", e);
        }
    }

    /**
     * 이미지 URL 생성 (Presigned URL 방식)
     * - 브라우저에서 10분간만 유효한 보안 주소를 생성합니다.
     * - 새로고침을 해도 이 시간 동안은 이미지가 유지됩니다.
     */
    public String getImageUrl(Long userId, String type) {
        String objectName = String.format("user/%d/%s.jpg", userId, type);
        try {
            // 외부망 클라이언트를 사용하여 Presigned URL 생성 (서명에 외부 호스트 포함)
            String url = externalMinioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(io.minio.http.Method.GET)
                            .bucket(BUCKET_NAME)
                            .object(objectName)
                            .expiry(10, java.util.concurrent.TimeUnit.MINUTES)
                            .build());

            log.info("Original External Presigned URL: {}", url);

            // 외부 URL에 경로(/minio 등)가 포함된 경우, 생성된 URL에 다시 입혀줍니다.
            // MinioClient는 엔드포인트에서 경로를 허용하지 않으므로 여기서 수동 보정이 필요합니다.
            if (externalUrl != null && !externalUrl.isEmpty()) {
                try {
                    java.net.URI baseUri = new java.net.URI(externalUrl);
                    String path = baseUri.getPath();
                    if (path != null && !path.isEmpty() && !path.equals("/")) {
                        java.net.URI currentUri = new java.net.URI(url);
                        // 이미 경로가 포함되어 있지 않은 경우에만 추가
                        if (!currentUri.getPath().startsWith(path)) {
                            url = url.replace(currentUri.getAuthority(), currentUri.getAuthority() + path);
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed to check/apply proxy path: {}", e.getMessage());
                }
            }

            // [Fail-Safe] 내부망 주소(minio-svc)가 포함되어 있다면 무조건 외부 도메인으로 교체
            String publicDomain = (externalUrl != null && !externalUrl.isEmpty())
                    ? externalUrl
                    : "https://i14a701.p.ssafy.io/minio-api";

            // internalUrl 이 "http://minio-svc:8887" 처럼 되어 있을 경우 브라우저 에러가 나므로 강제 교체
            if (url.contains("minio-svc")) {
                log.info("Internal URL leakage detected in Presigned URL. Applying Force-Fix: {}", url);
                java.net.URI currentUri = new java.net.URI(url);
                java.net.URI externalUri = new java.net.URI(publicDomain);

                // host와 port 부분을 외부 도메인으로 교체
                url = url.replace(currentUri.getScheme() + "://" + currentUri.getAuthority(), publicDomain);
            }

            log.info("Final Presigned URL: {}", url);
            return url;
        } catch (Exception e) {
            log.warn("Failed to generate presigned URL for {}: {}", objectName, e.getMessage());

            // 실패 시 Fallback URL도 외부망 주소 적용
            String baseUrl = (externalUrl != null && !externalUrl.isEmpty()) ? externalUrl : minioUrl;
            return String.format("%s/%s/%s", baseUrl, BUCKET_NAME, objectName);
        }
    }

    /**
     * 버킷 존재 확인 및 생성
     */
    private void ensureBucketExists() {
        try {
            boolean exists = minioClient.bucketExists(
                    BucketExistsArgs.builder()
                            .bucket(BUCKET_NAME)
                            .build());

            if (!exists) {
                minioClient.makeBucket(
                        MakeBucketArgs.builder()
                                .bucket(BUCKET_NAME)
                                .build());
                log.info("Bucket created: {}", BUCKET_NAME);
            }
        } catch (Exception e) {
            log.error("Failed to ensure bucket exists: {}", BUCKET_NAME, e);
            throw new RuntimeException("버킷 확인 실패", e);
        }
    }
}
