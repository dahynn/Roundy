package com.ssafya701.roundy.session.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

// BE → Client: 세션 입장 결과 응답
// 다이어그램 ⑯번

@Getter
@AllArgsConstructor
public class SessionEnterResponse {
    private boolean success; // 입장 성공 여부
    private String message; // 상태 메시지
    private Integer queuePosition; // 대기 순번 (FIFO)
    private String roomId; // 방 ID (매칭 성공 시)
    private String gender; // 본인 성별 (매칭 성공 시, MALE/FEMALE)

    // 대기 중 응답 생성자
    public SessionEnterResponse(boolean success, String message, Integer queuePosition) {
        this.success = success;
        this.message = message;
        this.queuePosition = queuePosition;
        this.roomId = null;
        this.gender = null;
    }

    // 매칭 성공 응답 생성자
    public static SessionEnterResponse matched(String roomId, String gender) {
        return new SessionEnterResponse(
                true,
                "매칭이 완료되었습니다.",
                0,
                roomId,
                gender);
    }
}
