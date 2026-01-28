package com.ssafya701.roundy.user.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum GenderType {
    MALE("남성"),
    FEMALE("여성");

    private final String description;
}