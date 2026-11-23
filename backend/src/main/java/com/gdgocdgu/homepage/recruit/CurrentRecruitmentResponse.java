package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.time.KstTime;
import java.time.Instant;
import java.util.List;

/** API-RCT-001 응답 data. 필드 이름과 순서는 명세와 같다. 시각은 KST 문자열. */
public record CurrentRecruitmentResponse(
        String rid,
        int cohort,
        String title,
        String status,
        String applyStartAt,
        String applyEndAt,
        List<String> tracks,
        String noticeMarkdown,
        String applyState,
        boolean canApply,
        Integer formVersion,
        String posterUrl) {

    static CurrentRecruitmentResponse of(Recruitment recruitment, Instant now) {
        ApplyState applyState = recruitment.applyState(now);
        return new CurrentRecruitmentResponse(
                recruitment.rid(),
                recruitment.cohort(),
                recruitment.title(),
                recruitment.status().name(),
                KstTime.format(recruitment.applyStartAt()),
                KstTime.format(recruitment.applyEndAt()),
                recruitment.tracks(),
                recruitment.noticeMarkdown(),
                applyState.name(),
                applyState.canApply(),
                recruitment.publishedFormVersion(),
                // 포스터 파일 → 공개 URL 변환은 OPS-008(포스터 교체) 구현 때 연결한다. 그 전까지는 null.
                null);
    }
}
