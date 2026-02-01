package com.ssafya701.roundy.global.error;

import lombok.Getter;

@Getter
public class CustomException extends RuntimeException {

    private final ErrorEnum errorEnum;

    public CustomException(ErrorEnum errorEnum) {
        super(errorEnum.getMessage());
        this.errorEnum = errorEnum;
    }

    public CustomException(ErrorEnum errorEnum, String detailMessage) {
        super(detailMessage); // 상위 RuntimeException에는 상세 메시지를 넣음
        this.errorEnum = errorEnum;
    }
}