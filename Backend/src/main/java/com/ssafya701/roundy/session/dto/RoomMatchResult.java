package com.ssafya701.roundy.session.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

// Lua Script 실행 결과 DTO
// MATCHED: 방 생성 성공 (남3녀3), WAITING: 대기 중

@Getter
@AllArgsConstructor
public class RoomMatchResult {
    private String status; // MATCHED or WAITING
    private Long roomId; // 방 ID (MATCHED일 때만)
    private List<String> males; // 남성 멤버 userId 리스트
    private List<String> females; // 여성 멤버 userId 리스트

    public static RoomMatchResult waiting(int maleCount, int femaleCount) {
        return new RoomMatchResult("WAITING", null, null, null);
    }

    public static RoomMatchResult matched(Long roomId, List<String> males, List<String> females) {
        return new RoomMatchResult("MATCHED", roomId, males, females);
    }
}
