package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.error.ErrorCode;
import org.springframework.http.HttpStatus;

/** 모집 · 지원 영역의 에러 코드. */
public enum RecruitErrorCode implements ErrorCode {

    FORM_NOT_PUBLISHED(HttpStatus.NOT_FOUND, "게시된 지원폼이 없습니다."),
    RECRUITMENT_CLOSED(HttpStatus.CONFLICT, "지원 기간이 아닙니다."),
    FORM_CHANGED(HttpStatus.CONFLICT, "지원폼이 변경되었습니다. 새로고침 후 다시 작성해주세요."),
    APPLICATION_DUPLICATED(HttpStatus.CONFLICT, "이미 제출된 지원서가 있습니다.");

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
