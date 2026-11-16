package com.gdgocdgu.homepage.auth;

import com.gdgocdgu.homepage.common.error.ErrorCode;
import org.springframework.http.HttpStatus;

enum AuthErrorCode implements ErrorCode {

    INVALID_GOOGLE_TOKEN(HttpStatus.UNAUTHORIZED, "Google 인증 확인 불가. 다시 로그인해 주세요.");

    private final HttpStatus status;
    private final String defaultMessage;

    AuthErrorCode(HttpStatus status, String defaultMessage) {
        this.status = status;
        this.defaultMessage = defaultMessage;
    }

    @Override
    public String code() {
        return name();
    }

    @Override
    public HttpStatus status() {
        return status;
    }

    @Override
    public String defaultMessage() {
        return defaultMessage;
    }
}
