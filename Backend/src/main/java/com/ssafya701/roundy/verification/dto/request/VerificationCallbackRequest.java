package com.ssafya701.roundy.verification.dto.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

// AI → BE: 검증 결과 전송 (동기 callback)
// 다이어그램 ⑨번

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class VerificationCallbackRequest {
    private String requestId; // 검증 세션 ID
    private boolean success; // 검증 성공 여부
}
