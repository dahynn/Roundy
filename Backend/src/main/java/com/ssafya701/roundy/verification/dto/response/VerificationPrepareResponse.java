package com.ssafya701.roundy.verification.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

// BE → AI: User의 검증 이미지 URL 응답
// 다이어그램 ⑤번

@Getter
@AllArgsConstructor
public class VerificationPrepareResponse {
    private String verificationImageUrl; // 캐시된 User 검증 이미지 URL
}
