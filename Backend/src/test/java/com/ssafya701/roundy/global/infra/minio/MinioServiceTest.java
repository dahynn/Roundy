package com.ssafya701.roundy.global.infra.minio;

import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import com.ssafya701.roundy.global.util.ImageOptimizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MinioServiceTest {

    @Mock
    private MinioClient minioClient;

    @Mock
    private MinioClient externalMinioClient;

    @Mock
    private ImageOptimizer imageOptimizer;

    private MinioService minioService;

    @BeforeEach
    void setUp() {
        minioService = new MinioService(minioClient, externalMinioClient, imageOptimizer);
        // BUCKET_NAME is a constant, no need to set it.
        ReflectionTestUtils.setField(minioService, "minioUrl", "http://localhost:9000");
    }

    @Test
    @DisplayName("이미지 업로드 성공")
    void uploadImage_Success() throws Exception {
        // given
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.png",
                "image/png",
                new byte[] {
                        (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
                        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, (byte) 0xC4, (byte) 0x89,
                        0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54,
                        0x78, (byte) 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05,
                        0x00, 0x01, 0x0D, 0x0A, 0x2D, (byte) 0xB4,
                        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, (byte) 0xAE, 0x42, 0x60, (byte) 0x82
                } // Valid minimal 1x1 PNG
        );
        Long userId = 123L;

        when(minioClient.bucketExists(any())).thenReturn(true);
        when(imageOptimizer.optimizeToWebp(any())).thenReturn(
                new com.ssafya701.roundy.global.util.ImageOptimizer.OptimizedImage(
                        new java.io.ByteArrayInputStream(new byte[] { 1, 2, 3 }),
                        3L,
                        "image/webp"));

        // when
        String path = minioService.uploadImage(userId, file, "profile");

        // then
        assertEquals("user/123/profile.webp", path); // uploadImage logic now uses webp
        verify(minioClient, times(1)).putObject(any(PutObjectArgs.class));
    }

    @Test
    @DisplayName("파일 검증 실패 - 잘못된 확장자")
    void uploadImage_InvalidExtension() {
        // given
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.txt",
                "text/plain",
                "test content".getBytes());

        // when & then
        assertThrows(RuntimeException.class, () -> minioService.uploadImage(1L, file, "profile"));
    }
}
