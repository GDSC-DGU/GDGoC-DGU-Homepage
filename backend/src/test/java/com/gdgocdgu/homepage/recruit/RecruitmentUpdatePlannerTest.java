package com.gdgocdgu.homepage.recruit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.common.error.CommonErrorCode;
import com.gdgocdgu.homepage.common.error.ErrorCode;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** DB 없이 RCT-008의 수정 · 상태 전이 규칙만 확인한다. */
class RecruitmentUpdatePlannerTest {

    static final Instant START = Instant.parse("2027-02-19T15:00:00Z");
    static final Instant END = Instant.parse("2027-03-05T14:59:59Z");
    static final Instant DURING = Instant.parse("2027-02-25T00:00:00Z");

    static Recruitment recruitment(RecruitmentStatus status, boolean closedManually, Integer publishedFormVersion) {
        return new Recruitment("rct_5", 5, "5기 모집", status, closedManually, START, END,
                List.of("BE", "FE"), "안내", publishedFormVersion, null);
    }

    static UpdateRecruitmentRequest status(String status) {
        return new UpdateRecruitmentRequest(null, null, null, null, null, null, status);
    }

    static Recruitment apply(Recruitment current, UpdateRecruitmentRequest request) {
        return RecruitmentUpdatePlanner.apply(current, false, request, DURING);
    }

    static void assertError(Runnable call, ErrorCode errorCode) {
        assertThatThrownBy(call::run)
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(errorCode);
    }

    @Test
    void 보낸_필드만_바꾸고_나머지는_그대로_둔다() {
        Recruitment updated = apply(recruitment(RecruitmentStatus.OPEN, false, 3),
                new UpdateRecruitmentRequest(" 새 제목 ", null, "2027-03-10T23:59:59+09:00", List.of("BE", "AI"),
                        null, null, null));

        assertThat(updated.title()).isEqualTo("새 제목");
        assertThat(updated.applyStartAt()).isEqualTo(START);
        assertThat(updated.applyEndAt()).isEqualTo(Instant.parse("2027-03-10T14:59:59Z"));
        assertThat(updated.tracks()).containsExactly("BE", "AI");
        assertThat(updated.noticeMarkdown()).isEqualTo("안내");
        assertThat(updated.status()).isEqualTo(RecruitmentStatus.OPEN);
    }

    @Test
    void DRAFT는_폼이_게시됐을_때만_SCHEDULED가_된다() {
        assertThat(apply(recruitment(RecruitmentStatus.DRAFT, false, 1), status("SCHEDULED")).status())
                .isEqualTo(RecruitmentStatus.SCHEDULED);
        assertError(() -> apply(recruitment(RecruitmentStatus.DRAFT, false, null), status("SCHEDULED")),
                RecruitErrorCode.FORM_NOT_PUBLISHED_FOR_SCHEDULE);
    }

    @ParameterizedTest
    @CsvSource({"SCHEDULED", "OPEN"})
    void SCHEDULED와_OPEN은_수동_마감할_수_있다(RecruitmentStatus from) {
        Recruitment closed = apply(recruitment(from, false, 1), status("CLOSED"));

        assertThat(closed.status()).isEqualTo(RecruitmentStatus.CLOSED);
        assertThat(closed.closedManually()).isTrue();
        assertThat(closed.applyState(DURING)).isEqualTo(ApplyState.CLOSED_MANUALLY);
    }

    @Test
    void 수동_마감은_종료_전에만_다시_열_수_있다() {
        Recruitment reopened = apply(recruitment(RecruitmentStatus.CLOSED, true, 1), status("OPEN"));
        assertThat(reopened.status()).isEqualTo(RecruitmentStatus.OPEN);
        assertThat(reopened.closedManually()).isFalse();

        assertError(() -> RecruitmentUpdatePlanner.apply(recruitment(RecruitmentStatus.CLOSED, true, 1), false,
                status("OPEN"), END.plusSeconds(1)), RecruitErrorCode.INVALID_STATUS_TRANSITION);
    }

    @Test
    void 기간을_함께_늘리면_종료된_수동_마감도_다시_열_수_있다() {
        Recruitment reopened = RecruitmentUpdatePlanner.apply(recruitment(RecruitmentStatus.CLOSED, true, 1), false,
                new UpdateRecruitmentRequest(null, null, "2027-03-20T23:59:59+09:00", null, null, null, "OPEN"),
                END.plusSeconds(1));

        assertThat(reopened.status()).isEqualTo(RecruitmentStatus.OPEN);
    }

    @ParameterizedTest
    @CsvSource({
            "DRAFT,false,OPEN", "DRAFT,false,CLOSED", "SCHEDULED,false,OPEN",
            "OPEN,false,SCHEDULED", "CLOSED,false,OPEN", "CLOSED,true,SCHEDULED"})
    void 표에_없는_전이는_INVALID_STATUS_TRANSITION이다(RecruitmentStatus from, boolean closedManually, String to) {
        assertError(() -> apply(recruitment(from, closedManually, 1), status(to)),
                RecruitErrorCode.INVALID_STATUS_TRANSITION);
    }

    @Test
    void 같은_상태로_바꾸면_그대로다() {
        Recruitment current = recruitment(RecruitmentStatus.OPEN, false, 1);

        assertThat(apply(current, status("OPEN"))).isEqualTo(current);
    }

    @Test
    void 기수를_바꾸면_회차_ID도_바뀌고_합격자_등록_후에는_막힌다() {
        Recruitment moved = apply(recruitment(RecruitmentStatus.DRAFT, false, null),
                new UpdateRecruitmentRequest(null, null, null, null, null, 6, null));
        assertThat(moved.rid()).isEqualTo("rct_6");
        assertThat(moved.cohort()).isEqualTo(6);

        assertError(() -> RecruitmentUpdatePlanner.apply(recruitment(RecruitmentStatus.CLOSED, false, 1), true,
                new UpdateRecruitmentRequest(null, null, null, null, null, 6, null), DURING),
                RecruitErrorCode.COHORT_LOCKED);
    }

    @Test
    void 잘못된_값이나_빈_요청은_VALIDATION_FAILED다() {
        Recruitment current = recruitment(RecruitmentStatus.OPEN, false, 1);

        assertError(() -> apply(current, new UpdateRecruitmentRequest(null, null, null, null, null, null, null)),
                CommonErrorCode.VALIDATION_FAILED);
        assertError(() -> apply(current, new UpdateRecruitmentRequest(" ", null, null, null, null, null, null)),
                CommonErrorCode.VALIDATION_FAILED);
        assertError(() -> apply(current, new UpdateRecruitmentRequest(null, "2027-03-06T00:00:00+09:00", null,
                null, null, null, null)), CommonErrorCode.VALIDATION_FAILED);
        assertError(() -> apply(current, new UpdateRecruitmentRequest(null, "2027-02-20T00:00:00", null,
                null, null, null, null)), CommonErrorCode.VALIDATION_FAILED);
        assertError(() -> apply(current, new UpdateRecruitmentRequest(null, null, null, List.of("BE", "BE"),
                null, null, null)), CommonErrorCode.VALIDATION_FAILED);
        assertError(() -> apply(current, new UpdateRecruitmentRequest(null, null, null, null, null, 0, null)),
                CommonErrorCode.VALIDATION_FAILED);
        assertError(() -> apply(current, status("DRAFT")), CommonErrorCode.VALIDATION_FAILED);
    }
}
