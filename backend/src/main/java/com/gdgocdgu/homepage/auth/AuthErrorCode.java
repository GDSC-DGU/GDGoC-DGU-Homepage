package com.gdgocdgu.homepage.auth;

import com.gdgocdgu.homepage.common.error.ErrorCode;
import org.springframework.http.HttpStatus;

enum AuthErrorCode implements ErrorCode {

    INVALID_GOOGLE_TOKEN(HttpStatus.UNAUTHORIZED, "Google 인증 확인 불가. 다시 로그인해 주세요."),
    GOOGLE_ACCOUNT_NOT_LINKED(HttpStatus.FORBIDDEN, "연결되지 않은 Google 계정. 초대 링크로 계정 먼저 연결해 주세요."),
    USER_INACTIVE(HttpStatus.FORBIDDEN, "비활성화된 사용자. 운영진에게 문의해주세요."),
    INVALID_ORIGIN(HttpStatus.FORBIDDEN, "허용되지 않은 요청"),
    // 아래 넷은 갱신(API-AUTH-002)에서 쓴다. 프론트는 401이면 로그아웃 상태로 바꾼다.
    REFRESH_TOKEN_REQUIRED(HttpStatus.UNAUTHORIZED, "다시 로그인해 주세요."),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "로그인 정보 확인 불가. 다시 로그인해 주세요."),
    SESSION_EXPIRED(HttpStatus.UNAUTHORIZED, "로그인 시간 만료. 다시 로그인해 주세요."),
    SESSION_REVOKED(HttpStatus.UNAUTHORIZED, "로그인이 해제됨. 다시 로그인해 주세요.");

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
