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
    private Long roomId; // 방 ID (매칭 성공 시)
    private Integer myNumber; // 본인 번호 (매칭 성공 시, 1/2/3)
    private String gender; // 본인 성별 (매칭 성공 시, MALE/FEMALE)

    // 대기 중 응답 생성자
    public SessionEnterResponse(boolean success, String message, Integer queuePosition) {
        this.success = success;
        this.message = message;
        this.queuePosition = queuePosition;
        this.roomId = null;
        this.myNumber = null;
        this.gender = null;
    }

    // 매칭 성공 응답 생성자
    public static SessionEnterResponse matched(Long roomId, String gender, int myNumber) {
        return new SessionEnterResponse(
                true,
                String.format("매칭 완료! 당신은 %s %d호입니다.",
                        "MALE".equals(gender) ? "남자" : "여자", myNumber),
                0,
                roomId,
                myNumber,
                gender);
    }
}
