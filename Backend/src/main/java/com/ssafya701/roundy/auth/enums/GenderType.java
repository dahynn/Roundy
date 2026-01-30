package com.ssafya701.roundy.auth.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum GenderType {
    MALE("남성"),
    FEMALE("여성");

    private final String description;
}