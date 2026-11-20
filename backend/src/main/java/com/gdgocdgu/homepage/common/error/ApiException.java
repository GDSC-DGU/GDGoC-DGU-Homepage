package com.gdgocdgu.homepage.common.error;

/** service가 던지는 예외. GlobalExceptionHandler가 코드에 맞는 상태 · 메시지로 바꾼다. */
public class ApiException extends RuntimeException {

    private final ErrorCode errorCode;

    public ApiException(ErrorCode errorCode) {
        this(errorCode, errorCode.defaultMessage());
    }

    public ApiException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }
}
