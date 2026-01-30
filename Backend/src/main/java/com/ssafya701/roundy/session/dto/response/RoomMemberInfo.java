package com.ssafya701.roundy.session.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

// BE → Client: 방 멤버 정보 (화상 화면 표시용)

@Getter
@AllArgsConstructor
public class RoomMemberInfo {
    private String roomId; // 방 ID
    private String gender; // MALE or FEMALE
}
