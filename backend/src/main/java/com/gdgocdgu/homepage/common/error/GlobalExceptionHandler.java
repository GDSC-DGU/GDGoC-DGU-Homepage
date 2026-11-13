package com.gdgocdgu.homepage.common.error;

import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * 모든 예외를 { success:false, code, message } 한 가지 모양으로 바꾼다.
 * 개인정보 보호를 위해 요청 본문 · 입력 값은 응답과 로그에 싣지 않는다
 * (검증 예외의 메시지에는 입력 값이 섞일 수 있으므로 예외 메시지를 쓰지 않는다).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ErrorResponse> handleApi(ApiException e) {
        return respond(e.getErrorCode(), e.getMessage());
    }

    @ExceptionHandler({
            MethodArgumentNotValidException.class,
            HandlerMethodValidationException.class,
            ConstraintViolationException.class,
            HttpMessageNotReadableException.class,
            ServletRequestBindingException.class, // 필수 파라미터 · 헤더 누락 포함
            TypeMismatchException.class,
            HttpMediaTypeNotSupportedException.class
    })
    ResponseEntity<ErrorResponse> handleValidation(Exception e) {
        return respond(CommonErrorCode.VALIDATION_FAILED);
    }

    @ExceptionHandler({NoHandlerFoundException.class, NoResourceFoundException.class})
    ResponseEntity<ErrorResponse> handleNotFound(Exception e) {
        return respond(CommonErrorCode.NOT_FOUND);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ErrorResponse> handleMethodNotAllowed(HttpRequestMethodNotSupportedException e) {
        return respond(CommonErrorCode.METHOD_NOT_ALLOWED);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> handleUnexpected(Exception e) {
        // 응답에는 고정 문구만. 원인 추적용 스택은 서버 로그에만 남긴다.
        log.error("처리되지 않은 예외", e);
        return respond(CommonErrorCode.INTERNAL_ERROR);
    }

    private ResponseEntity<ErrorResponse> respond(ErrorCode errorCode) {
        return respond(errorCode, errorCode.defaultMessage());
    }

    private ResponseEntity<ErrorResponse> respond(ErrorCode errorCode, String message) {
        return ResponseEntity.status(errorCode.status()).body(ErrorResponse.of(errorCode, message));
    }
}
