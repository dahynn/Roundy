package com.ssafya701.roundy.global.error;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorEnum {

    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다."),
    TOKEN_EXPIRATION(HttpStatus.UNAUTHORIZED, "토큰이 만료되었습니다."),
    INVALID_TOKEN_SIGNATURE(HttpStatus.UNAUTHORIZED, "잘못된 JWT 서명입니다."),
    INVALID_TOKEN_FORMAT(HttpStatus.UNAUTHORIZED, "지원되지 않는 토큰 형식입니다."),
    FALSE_TOKEN(HttpStatus.BAD_REQUEST, "토큰이 비어있거나 잘못되었습니다."),

    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "해당 사용자를 찾을 수 없습니다."),
    DUPLICATE_USER(HttpStatus.CONFLICT, "이미 존재하는 사용자입니다."),

    KAKAO_UNLINK_FAIL(HttpStatus.INTERNAL_SERVER_ERROR, "카카오 연결 끊기에 실패했습니다.");

    private final HttpStatus httpStatus;
    private final String message;
}