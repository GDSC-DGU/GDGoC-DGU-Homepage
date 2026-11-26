package com.gdgocdgu.homepage.recruit;

import java.util.List;

/** API-RCT-006 응답 data. */
public record RecruitmentListResponse(List<RecruitmentSummary> recruitments, Pagination pagination) {

    public RecruitmentListResponse {
        recruitments = List.copyOf(recruitments);
    }
}
