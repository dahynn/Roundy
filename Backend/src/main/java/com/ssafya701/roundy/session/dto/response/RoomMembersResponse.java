package com.ssafya701.roundy.session.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

// BE → Client: 방 전체 멤버 정보 (화상 UI 표시용)

@Getter
@AllArgsConstructor
public class RoomMembersResponse {
    private String roomId; // 방 ID
    private List<MemberDetail> males; // 남자 멤버들
    private List<MemberDetail> females; // 여자 멤버들

    @Getter
    @AllArgsConstructor
    public static class MemberDetail {
        private String userId; // 유저 ID
    }
}
