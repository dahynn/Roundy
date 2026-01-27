package com.ssafya701.roundy.global.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CommonResponse<T> {

    private final boolean success;
    private final T data;
    private final String message; // 에러 메시지를 직접 담는 필드

    // 성공 + 데이터 있음
    public static <T> CommonResponse<T> ofSuccess(T data) {
        return new CommonResponse<>(true, data, null);
    }

    // 성공 + 데이터 없음
    public static CommonResponse<Void> ofSuccess() {
        return new CommonResponse<>(true, null, null);
    }

    //실패 + 시스템 메시지
    public static CommonResponse<Void> ofFailure(String message) {
        return new CommonResponse<>(false, null, message);
    }
}