package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.error.ApiException;
import java.time.Instant;
import java.util.List;

/**
 * API-RCT-008 수정 규칙. 저장 전 회차와 요청으로 바뀐 회차를 계산한다(DB 없음).
 * 상태 전이표: DRAFT → SCHEDULED(폼 게시 후), SCHEDULED · OPEN → CLOSED(수동 마감), 수동 CLOSED → OPEN(종료 전 재개).
 * SCHEDULED → OPEN, OPEN → CLOSED(기간 종료)는 RCT-030이 저장하므로 여기서는 받지 않는다.
 */
final class RecruitmentUpdatePlanner {

    private RecruitmentUpdatePlanner() {
    }

    static Recruitment apply(Recruitment current, boolean membersRegistered, UpdateRecruitmentRequest request,
            Instant now) {
        if (request == null || request.isEmpty()) {
            throw RecruitmentInputs.invalid();
        }
        String title = request.title() == null ? current.title() : RecruitmentInputs.title(request.title());
        String notice = request.noticeMarkdown() == null
                ? current.noticeMarkdown() : RecruitmentInputs.notice(request.noticeMarkdown());
        List<String> tracks = request.tracks() == null ? current.tracks() : RecruitmentInputs.tracks(request.tracks());
        Instant start = request.applyStartAt() == null
                ? current.applyStartAt() : RecruitmentInputs.instant(request.applyStartAt());
        Instant end = request.applyEndAt() == null
                ? current.applyEndAt() : RecruitmentInputs.instant(request.applyEndAt());
        RecruitmentInputs.period(start, end);

        int cohort = current.cohort();
        String rid = current.rid();
        if (request.cohort() != null && request.cohort() != current.cohort()) {
            cohort = RecruitmentInputs.cohort(request.cohort());
            if (membersRegistered) {
                throw new ApiException(RecruitErrorCode.COHORT_LOCKED);
            }
            rid = "rct_" + cohort;
        }

        RecruitmentStatus status = current.status();
        boolean closedManually = current.closedManually();
        if (request.status() != null) {
            RecruitmentStatus target = targetStatus(request.status());
            if (target != current.status()) {
                switch (target) {
                    case SCHEDULED -> {
                        if (current.status() != RecruitmentStatus.DRAFT) {
                            throw invalidTransition();
                        }
                        if (current.publishedFormVersion() == null) {
                            throw new ApiException(RecruitErrorCode.FORM_NOT_PUBLISHED_FOR_SCHEDULE);
                        }
                    }
                    case CLOSED -> {
                        if (current.status() != RecruitmentStatus.SCHEDULED && current.status() != RecruitmentStatus.OPEN) {
                            throw invalidTransition();
                        }
                        closedManually = true;
                    }
                    case OPEN -> {
                        if (current.status() != RecruitmentStatus.CLOSED || !current.closedManually()) {
                            throw invalidTransition();
                        }
                        if (now.isAfter(end)) {
                            throw new ApiException(RecruitErrorCode.INVALID_STATUS_TRANSITION,
                                    "지원 기간이 끝난 회차는 다시 열 수 없습니다. 종료 시각을 함께 늦춰주세요.");
                        }
                        closedManually = false;
                    }
                    default -> throw invalidTransition();
                }
                status = target;
            }
        }
        return new Recruitment(rid, cohort, title, status, closedManually, start, end, tracks, notice,
                current.publishedFormVersion(), current.posterFileId());
    }

    /** 요청으로 바꿀 수 있는 값은 SCHEDULED · OPEN · CLOSED뿐이다. DRAFT로 되돌리는 값은 형식 오류로 본다. */
    private static RecruitmentStatus targetStatus(String value) {
        return switch (value) {
            case "SCHEDULED" -> RecruitmentStatus.SCHEDULED;
            case "OPEN" -> RecruitmentStatus.OPEN;
            case "CLOSED" -> RecruitmentStatus.CLOSED;
            default -> throw RecruitmentInputs.invalid();
        };
    }

    private static ApiException invalidTransition() {
        return new ApiException(RecruitErrorCode.INVALID_STATUS_TRANSITION);
    }
}
