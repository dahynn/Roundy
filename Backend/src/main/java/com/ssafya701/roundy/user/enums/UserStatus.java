package com.ssafya701.roundy.user.enums;

public enum UserStatus {

    JOINED, // "카카오 인증 + 추가 정보 기입"
    APPROVED, // "얼굴 인증 완료"
    VALID, // "취향 정보 기입 완료"
    BANNED, // "악질 유저"
    WITHDRAWN // "얼굴 인증 실패"
}
