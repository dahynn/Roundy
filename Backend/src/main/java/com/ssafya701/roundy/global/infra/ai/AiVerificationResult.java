package com.ssafya701.roundy.global.infra.ai;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * AI 서버 검증 결과
 */
@Getter
@AllArgsConstructor
public class AiVerificationResult {
    private boolean verified;
    private String errorMessage; // 얼굴 감지 실패 시 메시지
    
    public static AiVerificationResult success(boolean verified) {
        return new AiVerificationResult(verified, null);
    }
    
    public static AiVerificationResult faceDetectionError(String errorMessage) {
        return new AiVerificationResult(false, errorMessage);
    }
    
    public boolean hasFaceDetectionError() {
        return errorMessage != null;
    }
}
