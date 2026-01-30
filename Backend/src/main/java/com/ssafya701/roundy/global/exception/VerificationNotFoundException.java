package com.ssafya701.roundy.global.exception;

// requestId로 검증 기록을 찾을 수 없을 때 발생
// HTTP 404 Not Found

public class VerificationNotFoundException extends RuntimeException {
    public VerificationNotFoundException(String message) {
        super(message);
    }
}
