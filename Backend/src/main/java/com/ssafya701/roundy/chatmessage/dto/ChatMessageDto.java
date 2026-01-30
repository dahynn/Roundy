package com.ssafya701.roundy.chatmessage.dto;

import com.ssafya701.roundy.chatmessage.entity.ChatMessage;
import com.ssafya701.roundy.chatmessage.enums.MsgType;
import java.time.LocalDateTime;

public class ChatMessageDto {

    public record Request(
            String content
    ) {}

    // Response

    public record Response(
            Long id,
            Long matchId,
            Long senderId,
            String content,
            MsgType msgType,
            LocalDateTime createdAt,
            boolean isRead
    ) {
        public static Response from(ChatMessage message) {
            return new Response(
                    message.getId(),
                    message.getMatchId(),
                    message.getSenderId(),
                    message.getContent(),
                    message.getMsgType(),
                    message.getCreatedAt(),
                    message.isRead()
            );
        }
    }
}