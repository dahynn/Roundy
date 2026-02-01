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

    // Rate Limiting 초과 - 429
    @ExceptionHandler(com.ssafya701.roundy.global.exception.TooManyRequestsException.class)
    public ResponseEntity<CommonResponse<Void>> handleTooManyRequestsException(
            com.ssafya701.roundy.global.exception.TooManyRequestsException e) {
        log.warn("Rate Limit Exceeded: {}", e.getMessage());

        return ResponseEntity
                .status(HttpStatus.TOO_MANY_REQUESTS)
                .body(CommonResponse.ofFailure(e.getMessage()));
    }

    // 검증 기록 없음 - 404
    @ExceptionHandler(com.ssafya701.roundy.global.exception.VerificationNotFoundException.class)
    public ResponseEntity<CommonResponse<Void>> handleVerificationNotFoundException(
            com.ssafya701.roundy.global.exception.VerificationNotFoundException e) {
        log.warn("Verification Not Found: {}", e.getMessage());

        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
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

    // 파일 용량 초과 - 413
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<CommonResponse<Void>> handleMaxUploadSizeExceededException(
            org.springframework.web.multipart.MaxUploadSizeExceededException e) {
        log.warn("File Size Exceeded: {}", e.getMessage());

        return ResponseEntity
                .status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(CommonResponse.ofFailure("파일 크기가 너무 큽니다. (최대 10MB)"));
    }

    // MinIO 연결 실패 등 I/O 오류 - 500 (로그 강화)
    @ExceptionHandler(java.io.IOException.class)
    public ResponseEntity<CommonResponse<Void>> handleIOException(java.io.IOException e) {
        log.error("I/O Error (MinIO connection?): ", e);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(CommonResponse.ofFailure("파일 처리 중 오류가 발생했습니다."));
    }

    // user 부분 custom 예외 처리
    @ExceptionHandler(CustomException.class)
    public ResponseEntity<CommonResponse<Void>> handleCustomException(CustomException e) {
        log.warn("Custom Error: {}", e.getErrorEnum().getMessage());

        return ResponseEntity
                .status(e.getErrorEnum().getHttpStatus())
                .body(CommonResponse.ofFailure(e.getErrorEnum().getMessage()));
    }
}