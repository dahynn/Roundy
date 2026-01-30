package com.ssafya701.roundy.match.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;
@Getter
@AllArgsConstructor
public enum ChatStatus {
    ACTIVE("대화 가능"),
    TERMINATED("한 명 퇴장으로 인한 대화 종료 (복구 불가)");

    private final String description;
}
