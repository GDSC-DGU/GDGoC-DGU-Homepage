package com.gdgocdgu.homepage.recruit;

import java.time.Instant;
import java.util.List;

/**
 * 모집 회차 (Firestore recruitments/{rid}). 저장 구조는 backend/docs/rct-data-model.md 3-1.
 *
 * @param rid                  문서 ID. rct_{cohort}
 * @param publishedFormVersion 게시된 지원폼 버전. 없으면 null
 * @param posterFileId         OPS-008로 등록한 포스터 파일. 없으면 null
 */
public record Recruitment(
        String rid,
        int cohort,
        String title,
        RecruitmentStatus status,
        boolean closedManually,
        Instant applyStartAt,
        Instant applyEndAt,
        List<String> tracks,
        String noticeMarkdown,
        Integer publishedFormVersion,
        String posterFileId) {

    public Recruitment {
        tracks = tracks == null ? List.of() : List.copyOf(tracks);
    }

    /**
     * 지원 가능 판단. RCT-001 · 005 · 030이 이 함수 하나를 함께 쓴다.
     * 시작 · 종료 시각을 모두 포함한다(applyStartAt ≤ now ≤ applyEndAt 이면 접수 기간).
     */
    public ApplyState applyState(Instant now) {
        if (status == RecruitmentStatus.DRAFT || publishedFormVersion == null) {
            return ApplyState.NOT_PUBLISHED;
        }
        if (closedManually) {
            return ApplyState.CLOSED_MANUALLY;
        }
        if (now.isBefore(applyStartAt)) {
            return ApplyState.BEFORE_START;
        }
        if (now.isAfter(applyEndAt)) {
            return ApplyState.ENDED;
        }
        return ApplyState.OPEN;
    }

    /** 공개 화면에 보여 줄 수 있는 회차인지. DRAFT는 운영진만 본다. */
    public boolean isPublic() {
        return status != RecruitmentStatus.DRAFT;
    }
}
