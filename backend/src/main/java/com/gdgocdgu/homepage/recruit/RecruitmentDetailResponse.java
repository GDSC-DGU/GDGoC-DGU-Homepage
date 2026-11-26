package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.time.KstTime;
import java.time.Instant;
import java.util.List;

/** API-RCT-008 응답 data. 필드 이름과 순서는 명세와 같다. */
public record RecruitmentDetailResponse(
        String rid,
        int cohort,
        String title,
        String status,
        String applyStartAt,
        String applyEndAt,
        List<String> tracks,
        String noticeMarkdown,
        String applyState) {

    static RecruitmentDetailResponse of(Recruitment recruitment, Instant now) {
        return new RecruitmentDetailResponse(
                recruitment.rid(),
                recruitment.cohort(),
                recruitment.title(),
                recruitment.status().name(),
                KstTime.format(recruitment.applyStartAt()),
                KstTime.format(recruitment.applyEndAt()),
                recruitment.tracks(),
                recruitment.noticeMarkdown(),
                recruitment.applyState(now).name());
    }
}
