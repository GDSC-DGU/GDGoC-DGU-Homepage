package com.gdgocdgu.homepage.recruit;

/** 지금 지원할 수 있는지 (RCT-001 표). 저장하지 않고 매 요청 {@link Recruitment#applyState}로 계산한다. */
public enum ApplyState {
    NOT_PUBLISHED,
    BEFORE_START,
    OPEN,
    ENDED,
    CLOSED_MANUALLY;

    public boolean canApply() {
        return this == OPEN;
    }
}
