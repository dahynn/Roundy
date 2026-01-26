package com.ssafya701.roundy.global.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.UUID;

@Component
public class FileUploader {

    // application.yml에 file.upload-dir 설정 필요 (예: /home/ubuntu/images/)
    @Value("${file.upload-dir}")
    private String uploadDir;

    public String upload(MultipartFile file) {
        if (file == null || file.isEmpty()) return null;

        try {
            File dir = new File(uploadDir);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            String originalFilename = file.getOriginalFilename();
            String savedFileName = UUID.randomUUID() + "_" + originalFilename;
            String fullPath = uploadDir + savedFileName;

            file.transferTo(new File(fullPath));

            // 나중에 웹에서 접근 가능한 URL로 반환하거나 파일명만 반환
            return savedFileName;
        } catch (IOException e) {
            throw new RuntimeException("파일 저장 실패", e);
        }
    }
}