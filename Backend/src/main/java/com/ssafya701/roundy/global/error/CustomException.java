package com.ssafya701.roundy.global.error;

import lombok.Getter;

@Getter
public class CustomException extends RuntimeException {

    private final ErrorEnum errorEnum;

    public CustomException(ErrorEnum errorEnum) {
        super(errorEnum.getMessage());
        this.errorEnum = errorEnum;
    }
}