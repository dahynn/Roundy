package com.ssafya701.roundy.global.error;

import lombok.Getter;

@Getter
public class BusinessLogicException extends RuntimeException {

    public BusinessLogicException(String message) {
        super(message);
    }
}