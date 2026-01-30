package com.ssafya701.roundy.auth.enums;

public enum UserStatus {

    JOINED, // "카카오 인증 + 추가 정보 기입"
    PENDING_VERIFICATION, // "검증용 사진 추가"
    VALID, // "취향 정보 기입 완료"
    BANNED, // "악질 유저" 피드백 받을때 적용
    WITHDRAWN // "얼굴 인증 실패" -> 로테이션 입장 금지

}
