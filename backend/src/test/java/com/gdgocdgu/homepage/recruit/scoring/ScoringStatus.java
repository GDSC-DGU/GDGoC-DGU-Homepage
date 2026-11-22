package com.gdgocdgu.homepage.recruit.scoring;

/** API-RCT-028 응답의 {@code scoringStatus}. */
public enum ScoringStatus {
    DONE,
    RUNNING,
    FAILED,
    /** 지원서가 없거나 삭제됐거나, 기준 버전 · 실행 번호가 달라 이번 요청을 처리하지 않았다. */
    SKIPPED_STALE
}
