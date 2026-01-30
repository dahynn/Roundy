package com.ssafya701.roundy.session.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

// BE → Client: 대기실 현황 조회 응답 (메인 홈 화면용)
// GET /api/session/status

@Getter
@AllArgsConstructor
public class SessionStatusResponse {
    private int maleCount; // 남성 대기 인원
    private int femaleCount; // 여성 대기 인원
    private int totalCount; // 전체 대기 인원
    private int availableSlots; // 참여 가능한 자리 (유저 성별 기준)
}
