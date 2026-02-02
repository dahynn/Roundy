package com.ssafya701.roundy.global.exception;

// Rate Limiting 초과 시 발생하는 예외
// HTTP 429 Too Many Requests

public class TooManyRequestsException extends RuntimeException {
    public TooManyRequestsException(String message) {
        super(message);
    }
}
