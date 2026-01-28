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
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "잘못된 입력입니다."),

    // 파일 업로드 관련
    FILE_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "파일 크기는 5MB를 초과할 수 없습니다."),
    INVALID_FILE_TYPE(HttpStatus.BAD_REQUEST, "지원하지 않는 파일 형식입니다. (JPEG, PNG, WebP만 허용)"),
    INVALID_FILENAME(HttpStatus.BAD_REQUEST, "올바르지 않은 파일명입니다."),
    CORRUPTED_IMAGE(HttpStatus.BAD_REQUEST, "손상된 이미지 파일입니다."),

    // 카카오 인증 관련
    KAKAO_AUTH_FAILED(HttpStatus.UNAUTHORIZED, "카카오 인증에 실패했습니다."),
    KAKAO_UNLINK_FAIL(HttpStatus.INTERNAL_SERVER_ERROR, "카카오 연결 끊기에 실패했습니다."),

    // 온보딩 관련
    INVALID_PREFERENCE_COUNT(HttpStatus.BAD_REQUEST, "선호도 선택 개수가 올바르지 않습니다."),

    // 쪽지방 관련
    MATCH_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 쪽지방입니다."),
    MATCH_ACCESS_DENIED(HttpStatus.FORBIDDEN, "해당 쪽지방에 접근할 권한이 없습니다."),
    MATCH_TERMINATED(HttpStatus.BAD_REQUEST, "이미 종료된 대화방입니다.");

    private final HttpStatus httpStatus;
    private final String message;
}