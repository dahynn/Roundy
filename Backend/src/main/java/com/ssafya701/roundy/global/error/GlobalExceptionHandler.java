package com.ssafya701.roundy.global.error;

import com.ssafya701.roundy.global.common.CommonResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {


    // 비즈니스 로직 예외 - 400
    @ExceptionHandler(BusinessLogicException.class)
    public ResponseEntity<CommonResponse<Void>> handleBusinessLogicException(BusinessLogicException e) {
        log.warn("Business Logic Error: {}", e.getMessage());

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(CommonResponse.ofFailure(e.getMessage()));
    }

    // 인자 값 예외 - 400
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<CommonResponse<Void>> handleIllegalArgumentException(IllegalArgumentException e) {
        log.warn("Invalid Argument: {}", e.getMessage());

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(CommonResponse.ofFailure(e.getMessage()));
    }


    // 그 외의 예외 발생시 - 500
    @ExceptionHandler(Exception.class)
    public ResponseEntity<CommonResponse<Void>> handleException(Exception e) {
        log.error("Unexpected Error: ", e);

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(CommonResponse.ofFailure("서버 내부 오류"));
    }
}