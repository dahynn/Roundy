package com.ssafya701.roundy.verification.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 검증 API 응답 DTO
 * POST /api/verification/verify
 */
@Getter
@AllArgsConstructor
public class VerificationResponse {
    private String requestId;  // 검증 UUID
    private boolean verified;  // 검증 결과
}
