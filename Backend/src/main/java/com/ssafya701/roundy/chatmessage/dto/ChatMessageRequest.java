package com.ssafya701.roundy.chatmessage.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ChatMessageRequest {

    private String content;

    public ChatMessageRequest(String content) {
        this.content = content;
    }

}