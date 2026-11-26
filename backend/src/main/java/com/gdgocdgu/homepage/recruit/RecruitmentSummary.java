package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.time.KstTime;
import java.time.Instant;

/** API-RCT-006 목록의 회차 하나. 필드 이름과 순서는 명세와 같다. */
public record RecruitmentSummary(
        String rid,
        int cohort,
        String title,
        String status,
        String applyStartAt,
        String applyEndAt,
        String applyState,
        long applicationCount) {

    static RecruitmentSummary of(Recruitment recruitment, Instant now, long applicationCount) {
        return new RecruitmentSummary(
                recruitment.rid(),
                recruitment.cohort(),
                recruitment.title(),
                recruitment.status().name(),
                KstTime.format(recruitment.applyStartAt()),
                KstTime.format(recruitment.applyEndAt()),
                recruitment.applyState(now).name(),
                applicationCount);
    }
}
