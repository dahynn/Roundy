package com.ssafya701.roundy.verification.dto.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

// AI → BE: 검증 이미지 URL 요청
// 다이어그램 ④번

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class VerificationPrepareRequest {
    private String requestId; // 검증 세션 ID
}
