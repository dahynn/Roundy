package com.ssafya701.roundy.user.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum UserRole {

    GUEST("ROLE_GUEST"), // 로그인
    USER("ROLE_USER"), // 최종 회원 가입
    ADMIN("ROLE_ADMIN");

    private final String key;
}
