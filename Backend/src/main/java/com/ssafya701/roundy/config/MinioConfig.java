package com.ssafya701.roundy.config;

import io.minio.MinioClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

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
        return buildMinioClient(url);
    }

    @Bean
    public MinioClient externalMinioClient() {
        String targetUrl = (externalUrl != null && !externalUrl.isEmpty()) ? externalUrl : url;
        log.info("Initializing External MinIO client for Presigned URLs: url={}", targetUrl);
        return buildMinioClient(targetUrl);
    }

    private MinioClient buildMinioClient(String endpoint) {
        String strippedUrl = stripPath(endpoint);
        String path = getPath(endpoint);

        MinioClient.Builder builder = MinioClient.builder()
                .endpoint(strippedUrl)
                .credentials(accessKey, secretKey)
                .region("us-east-1");

        if (path != null && !path.isEmpty() && !path.equals("/")) {
            okhttp3.OkHttpClient httpClient = new okhttp3.OkHttpClient.Builder()
                    .addInterceptor(chain -> {
                        okhttp3.Request original = chain.request();
                        okhttp3.HttpUrl originalUrl = original.url();

                        String encodedPath = originalUrl.encodedPath();
                        if (!encodedPath.startsWith(path)) {
                            okhttp3.HttpUrl newUrl = originalUrl.newBuilder()
                                    .encodedPath(path + encodedPath)
                                    .build();
                            return chain.proceed(original.newBuilder().url(newUrl).build());
                        }
                        return chain.proceed(original);
                    })
                    .build();
            builder.httpClient(httpClient);
        }

        return builder.build();
    }

    private String stripPath(String urlString) {
        if (urlString == null || urlString.isEmpty())
            return urlString;
        try {
            java.net.URI uri = new java.net.URI(urlString);
            return new java.net.URI(uri.getScheme(), uri.getAuthority(), null, null, null).toString();
        } catch (Exception e) {
            log.warn("Failed to strip path: {}", urlString);
            return urlString;
        }
    }

    private String getPath(String urlString) {
        if (urlString == null || urlString.isEmpty())
            return null;
        try {
            java.net.URI uri = new java.net.URI(urlString);
            String path = uri.getPath();
            // 끝에 '/'가 있으면 제거 (엔드포인트 결합 시 이중 슬래시 방지)
            if (path != null && path.endsWith("/")) {
                path = path.substring(0, path.length() - 1);
            }
            return path;
        } catch (Exception e) {
            return null;
        }
    }
}
