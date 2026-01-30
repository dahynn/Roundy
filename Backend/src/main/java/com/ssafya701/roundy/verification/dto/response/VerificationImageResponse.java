package com.ssafya701.roundy.verification.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 검증용 이미지 URL 응답 DTO
 * GET /api/verification/verify
 */
@Getter
@AllArgsConstructor
public class VerificationImageResponse {
    private String verificationImgUrl;  // 변수명 통일 (imageUrl -> verificationImgUrl)
}
