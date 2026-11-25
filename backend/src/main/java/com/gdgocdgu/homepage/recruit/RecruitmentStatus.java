package com.gdgocdgu.homepage.recruit;

/** 저장된 모집 상태 (RCT-008 전이표). 지원 가능 여부는 이 값이 아니라 {@link ApplyState}로 판단한다. */
public enum RecruitmentStatus {
    DRAFT,
    SCHEDULED,
    OPEN,
    CLOSED
}
