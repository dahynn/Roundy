package com.ssafya701.roundy.global.util;

import com.ssafya701.roundy.global.error.CustomException;
import com.ssafya701.roundy.global.error.ErrorEnum;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Component
public class FileUploader {

    // TODO : 인프라 분과 논의 후 수정 예정
    @Value("${file.upload-dir:./uploads/}")
    private String uploadDir;

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final List<String> ALLOWED_CONTENT_TYPES = Arrays.asList(
            "image/jpeg", "image/png", "image/webp");

    public String upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        // 파일 검증
        validateFile(file);

        try {
            // 실행 환경의 절대 경로를 기준으로 저장 위치 확정
            Path rootPath = Paths.get(System.getProperty("user.dir")).toAbsolutePath().normalize();
            Path targetDirectory = rootPath.resolve("uploads").normalize();

            // uploads 폴더가 없으면 생성
            if (!Files.exists(targetDirectory)) {
                Files.createDirectories(targetDirectory);
            }

            // 파일명 생성 (UUID 활용)
            String originalFilename = file.getOriginalFilename();
            String savedFileName = UUID.randomUUID() + "_"
                    + (originalFilename != null ? originalFilename : "image.png");

            // 최종 저장 경로 설정
            Path targetPath = targetDirectory.resolve(savedFileName);

            // InputStream을 사용하여 직접 복사 (톰캣 임시 경로 문제 회피)
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            return savedFileName;

        } catch (IOException e) {
            throw new RuntimeException("파일 저장 실패함 : " + e.getMessage(), e);
        }
    }

    /**
     * 파일 업로드 전 검증 (4단계)
     * 1. 파일 크기 검증 (5MB 제한)
     * 2. MIME Type 검증
     * 3. 파일명 새니타이징
     * 4. 실제 이미지 검증
     */
    private void validateFile(MultipartFile file) {
        // 1단계: 파일 크기 검증
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new CustomException(ErrorEnum.FILE_SIZE_EXCEEDED);
        }

        // 2단계: MIME Type 검증
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new CustomException(ErrorEnum.INVALID_FILE_TYPE);
        }

        // 3단계: 파일명 새니타이징 (Path Traversal 방지)
        String originalFilename = file.getOriginalFilename();
        if (originalFilename != null && (originalFilename.contains("..") || originalFilename.contains("/"))) {
            throw new CustomException(ErrorEnum.INVALID_FILENAME);
        }

        // 4단계: 실제 이미지 검증 (매직 넘버 체크 + 압축 폭탄 방지)
        try (InputStream is = file.getInputStream()) {
            BufferedImage image = ImageIO.read(is);
            if (image == null) {
                throw new CustomException(ErrorEnum.CORRUPTED_IMAGE);
            }

            // 이미지 크기 검증 (압축 폭탄 방지: 최대 10000x10000)
            if (image.getWidth() * image.getHeight() > 10000 * 10000) {
                throw new CustomException(ErrorEnum.FILE_SIZE_EXCEEDED);
            }
        } catch (IOException e) {
            throw new CustomException(ErrorEnum.CORRUPTED_IMAGE);
        }
    }
}