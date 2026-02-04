package com.ssafya701.roundy.match.dto;

import com.ssafya701.roundy.match.entity.Match;
import com.ssafya701.roundy.match.enums.ChatStatus;
import java.time.LocalDateTime;

public class MatchDto {

    // 매칭 정보 조회 응답
    public record Response(
            Long id,
            Long opponentId,
            String nickname,
            String profileImgUrl,
            String lastMessageContent,
            LocalDateTime lastMessageAt,
            ChatStatus chatStatus,
            int unreadCount) {
        public static Response from(Match match, com.ssafya701.roundy.auth.entity.User opponent) {

            return new Response(
                    match.getId(),
                    opponent.getId(),
                    opponent.getNickName(),
                    opponent.getProfileImageUrl(),
                    match.getLastMessageContent(),
                    match.getLastMessageAt(),
                    match.getChatStatus(),
                    0 // unreadCount 추후 구현 시 변경
            );
        }
    }

    // 채팅방 나가기 응답
    public record LeaveResponse(
            Long matchId,
            ChatStatus chatStatus,
            String message) {
        public static LeaveResponse from(Match match) {
            return new LeaveResponse(
                    match.getId(),
                    match.getChatStatus(),
                    "대화가 종료되었습니다.");
        }
    }
}