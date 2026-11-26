package com.gdgocdgu.homepage.recruit;

import java.util.List;

/** API-RCT-007 요청 본문. 시각은 오프셋이 있는 ISO 8601 문자열(예: 2027-02-20T00:00:00+09:00). */
public record CreateRecruitmentRequest(
        Integer cohort,
        String title,
        String applyStartAt,
        String applyEndAt,
        List<String> tracks,
        String noticeMarkdown) {
}
