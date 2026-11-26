package com.gdgocdgu.homepage.recruit;

import java.time.Instant;
import java.util.List;

/** RCT-007로 만들 새 회차. 상태는 항상 DRAFT로 시작한다. */
public record NewRecruitment(
        String rid,
        int cohort,
        String title,
        Instant applyStartAt,
        Instant applyEndAt,
        List<String> tracks,
        String noticeMarkdown,
        String createdBy,
        Instant createdAt) {

    public NewRecruitment {
        tracks = List.copyOf(tracks);
    }
}
