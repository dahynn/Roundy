package com.ssafya701.roundy.global.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Component
public class FileUploader {

    // TODO : 인프라 분과 논의 후 수정 예정
    @Value("${file.upload-dir:./uploads/}")
    private String uploadDir;

    public String upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }

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
            String savedFileName = UUID.randomUUID() + "_" + (originalFilename != null ? originalFilename : "image.png");

            // 최종 저장 경로 설정
            Path targetPath = targetDirectory.resolve(savedFileName);

            // InputStream을 사용하여 직접 복사 (톰캣 임시 경로 문제 회피)
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            return savedFileName;

        } catch (IOException e) {
            throw new RuntimeException("파일 저장 실패함 : " + e.getMessage(), e);
        }
    }
}