package com.gdgocdgu.homepage.recruit.scoring;

import com.gdgocdgu.homepage.common.error.ErrorCode;
import org.springframework.http.HttpStatus;

/** 채점 실행(API-RCT-028)이 돌려주는 업무 오류 코드. */
public enum RecruitScoringErrorCode implements ErrorCode {

    /** AI가 일시적으로 실패했다. 503을 돌려 Cloud Tasks가 같은 작업을 다시 보내게 한다. */
    SCORING_RETRY(HttpStatus.SERVICE_UNAVAILABLE, "채점을 다시 시도합니다.");

    private final HttpStatus status;
    private final String defaultMessage;

    RecruitScoringErrorCode(HttpStatus status, String defaultMessage) {
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
