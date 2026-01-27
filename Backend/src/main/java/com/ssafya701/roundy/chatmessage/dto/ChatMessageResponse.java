package com.ssafya701.roundy.chatmessage.dto;

import com.ssafya701.roundy.chatmessage.entity.ChatMessage;
import com.ssafya701.roundy.chatmessage.enums.MsgType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ChatMessageResponse {

    private Long id;
    private Long matchId;
    private Long senderId;
    private String content;
    private MsgType msgType;
    private LocalDateTime createdAt;
    private boolean isRead;

    public static ChatMessageResponse from(ChatMessage message) {
        return ChatMessageResponse.builder()
                .id(message.getId())
                .matchId(message.getMatchId())
                .senderId(message.getSenderId())
                .content(message.getContent())
                .msgType(message.getMsgType())
                .createdAt(message.getCreatedAt())
                .isRead(message.isRead())
                .build();
    }

}
