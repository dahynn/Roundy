package com.ssafya701.roundy.match.dto;

import com.ssafya701.roundy.match.entity.Match;
import com.ssafya701.roundy.match.enums.ChatStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class MatchResponse {

    private Long id;
    private Long opponentId;
    private String lastMessageContent;
    private LocalDateTime lastMessageAt;
    private ChatStatus chatStatus;
    private int unreadCount; // 현재는 0으로 고정 (추후 구현)

    public static MatchResponse from(Match match, Long currentUserId) {
        Long opponentId = match.getMaleId().equals(currentUserId) ? match.getFemaleId() : match.getMaleId();

        return MatchResponse.builder()
                .id(match.getId())
                .opponentId(opponentId)
                .lastMessageContent(match.getLastMessageContent())
                .lastMessageAt(match.getLastMessageAt())
                .chatStatus(match.getChatStatus())
                .unreadCount(0)
                .build();
    }

}
