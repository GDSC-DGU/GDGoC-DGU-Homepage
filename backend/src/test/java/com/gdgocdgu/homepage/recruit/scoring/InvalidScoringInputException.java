package com.gdgocdgu.homepage.recruit.scoring;

/** 기준 · 폼 · 답안 데이터가 맞지 않아 AI 요청을 만들 수 없다. 재시도해도 같으므로 FAILED로 저장한다. */
class InvalidScoringInputException extends RuntimeException {

    private final String errorCode;

    InvalidScoringInputException(String errorCode) {
        super(errorCode);
        this.errorCode = errorCode;
    }

    String errorCode() {
        return errorCode;
    }
}
