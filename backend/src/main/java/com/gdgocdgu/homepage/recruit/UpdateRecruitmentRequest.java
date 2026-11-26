package com.gdgocdgu.homepage.recruit;

import java.util.List;

/** API-RCT-008 요청 본문. 바꿀 필드만 보내고, 보내지 않았거나 null인 필드는 그대로 둔다. */
public record UpdateRecruitmentRequest(
        String title,
        String applyStartAt,
        String applyEndAt,
        List<String> tracks,
        String noticeMarkdown,
        Integer cohort,
        String status) {

    boolean isEmpty() {
        return title == null && applyStartAt == null && applyEndAt == null && tracks == null
                && noticeMarkdown == null && cohort == null && status == null;
    }
}
