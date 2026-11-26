package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.error.ErrorCode;
import org.springframework.http.HttpStatus;

/** 모집 · 지원 영역의 에러 코드. 응답의 code는 상수 이름이고, 명세상 같은 code를 다른 상태로 쓰면 code를 따로 준다. */
public enum RecruitErrorCode implements ErrorCode {

    FORM_NOT_PUBLISHED(HttpStatus.NOT_FOUND, "게시된 지원폼이 없습니다."),
    RECRUITMENT_CLOSED(HttpStatus.CONFLICT, "지원 기간이 아닙니다."),
    FORM_CHANGED(HttpStatus.CONFLICT, "지원폼이 변경되었습니다. 새로고침 후 다시 작성해주세요."),
    APPLICATION_DUPLICATED(HttpStatus.CONFLICT, "이미 제출된 지원서가 있습니다."),
    /** RCT-007 · 008. 메시지에 기수를 넣어 던진다. */
    COHORT_EXISTS(HttpStatus.CONFLICT, "같은 기수의 모집 회차가 이미 있습니다."),
    COHORT_LOCKED(HttpStatus.CONFLICT, "합격자 등록 후에는 기수를 바꿀 수 없습니다."),
    INVALID_STATUS_TRANSITION(HttpStatus.CONFLICT, "현재 상태에서 바꿀 수 없는 상태입니다."),
    /** RCT-008 DRAFT → SCHEDULED. 응답 code는 RCT-002와 같은 FORM_NOT_PUBLISHED지만 상태는 409다. */
    FORM_NOT_PUBLISHED_FOR_SCHEDULE("FORM_NOT_PUBLISHED", HttpStatus.CONFLICT, "지원폼을 먼저 게시해주세요.");

    private final String code;
    private final HttpStatus status;
    private final String defaultMessage;

    RecruitErrorCode(HttpStatus status, String defaultMessage) {
        this(null, status, defaultMessage);
    }

    RecruitErrorCode(String code, HttpStatus status, String defaultMessage) {
        this.code = code;
        this.status = status;
        this.defaultMessage = defaultMessage;
    }

    @Override
    public String code() {
        return code == null ? name() : code;
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
