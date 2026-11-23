package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.error.ErrorCode;
import org.springframework.http.HttpStatus;

/** 모집 · 지원 영역의 에러 코드. */
public enum RecruitErrorCode implements ErrorCode {

    FORM_NOT_PUBLISHED(HttpStatus.NOT_FOUND, "게시된 지원폼이 없습니다.");

    private final HttpStatus status;
    private final String defaultMessage;

    RecruitErrorCode(HttpStatus status, String defaultMessage) {
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
