package com.gdgocdgu.homepage.recruit;

import java.time.Instant;

/** 저장할 새 지원서와 중복 방지 키 두 개. */
public record NewApplication(
        String aid,
        String rid,
        ApplicationSubmission submission,
        String studentIdKey,
        String emailKey,
        Instant submittedAt) {
}
