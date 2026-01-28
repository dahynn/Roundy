package com.ssafya701.roundy.session.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

// BE → Client: 방 멤버 정보 (화상 화면 표시용)
// "남자 1호님", "여자 2호님" 등 표시

@Getter
@AllArgsConstructor
public class RoomMemberInfo {
    private Long roomId; // 방 ID
    private String gender; // MALE or FEMALE
    private int myNumber; // 본인 번호 (1, 2, 3)
}
