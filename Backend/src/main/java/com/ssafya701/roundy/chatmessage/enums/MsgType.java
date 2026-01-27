package com.ssafya701.roundy.chatmessage.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum MsgType {
    TALK("일반 대화"),
    SYSTEM("알림/퇴장 메시지");

    private final String description;
}
