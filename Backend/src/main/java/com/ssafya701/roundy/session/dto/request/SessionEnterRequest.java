package com.ssafya701.roundy.session.dto.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

// Client → BE: 검증 완료 후 세션 대기실 입장 요청
// 다이어그램 ⑬번

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class SessionEnterRequest {
    private String requestId; // 검증 세션 ID
}
