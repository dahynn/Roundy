package com.ssafya701.roundy.global.util;

import com.sksamuel.scrimage.ImmutableImage;
import com.sksamuel.scrimage.webp.WebpWriter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

@Slf4j
@Component
public class ImageOptimizer {

    private static final int TARGET_WIDTH = 1080;
    private static final int WEBP_QUALITY = 80;

    /**
     * 이미지를 WebP 형식으로 변환하고 최적화합니다.
     *
     * @param file 업로드된 이미지 파일
     * @return 최적화된 WebP 이미지의 InputStream
     * @throws IOException 이미지 처리 중 오류 발생 시
     */
    public OptimizedImage optimizeToWebp(MultipartFile file) throws IOException {
        long startTime = System.currentTimeMillis();
        long originalSize = file.getSize();

        try (InputStream is = file.getInputStream()) {
            ImmutableImage image = ImmutableImage.loader().fromStream(is);

            // 가로가 TARGET_WIDTH보다 크면 비율 맞춰서 리사이징
            if (image.width > TARGET_WIDTH) {
                image = image.scaleToWidth(TARGET_WIDTH);
            }

            // WebP로 변환 (품질 80설정)
            // WebP로 변환
            byte[] webpData = image.forWriter(WebpWriter.MAX_LOSSLESS_COMPRESSION).bytes();

            long endTime = System.currentTimeMillis();
            log.info("Image optimized: {} bytes -> {} bytes (reduced by {}%), time: {}ms",
                    originalSize, webpData.length,
                    (originalSize - webpData.length) * 100 / originalSize,
                    (endTime - startTime));

            return new OptimizedImage(
                    new ByteArrayInputStream(webpData),
                    webpData.length,
                    "image/webp");
        }
    }

    public record OptimizedImage(InputStream inputStream, long size, String contentType) {
    }
}
