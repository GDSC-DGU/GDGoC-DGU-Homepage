package com.gdgocdgu.homepage.recruit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.common.error.CommonErrorCode;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;

/** DB 없이 회차 고르기 규칙만 확인한다. */
class RecruitmentServiceTest {

    static final Clock NOW = Clock.fixed(Instant.parse("2027-03-10T00:00:00Z"), ZoneOffset.UTC);

    static Recruitment recruitment(String rid, int cohort, RecruitmentStatus status, String startAt) {
        Instant start = Instant.parse(startAt);
        return new Recruitment(rid, cohort, cohort + "기 모집", status, false,
                start, start.plusSeconds(14 * 24 * 3600), List.of("BE"), "안내", 1, null);
    }

    static RecruitmentService serviceWith(Recruitment... recruitments) {
        return new RecruitmentService(InMemoryRecruitmentRepository.of(recruitments), NOW);
    }

    @Test
    void DRAFT가_아닌_회차_중_지원_시작일이_가장_늦은_회차를_고른다() {
        RecruitmentService service = serviceWith(
                recruitment("rct_4", 4, RecruitmentStatus.CLOSED, "2026-09-01T00:00:00Z"),
                recruitment("rct_5", 5, RecruitmentStatus.CLOSED, "2027-02-20T00:00:00Z"),
                recruitment("rct_6", 6, RecruitmentStatus.DRAFT, "2027-09-01T00:00:00Z"));

        CurrentRecruitmentResponse current = service.getCurrent();

        assertThat(current.rid()).isEqualTo("rct_5");
    }

    @Test
    void 기간이_끝나도_다음_회차가_없으면_그_회차를_ENDED로_돌려준다() {
        RecruitmentService service = serviceWith(
                recruitment("rct_5", 5, RecruitmentStatus.CLOSED, "2027-02-01T00:00:00Z"));

        CurrentRecruitmentResponse current = service.getCurrent();

        assertThat(current.applyState()).isEqualTo("ENDED");
        assertThat(current.canApply()).isFalse();
    }

    @Test
    void 지원_시작일이_같으면_기수가_큰_회차를_고른다() {
        RecruitmentService service = serviceWith(
                recruitment("rct_6", 6, RecruitmentStatus.SCHEDULED, "2027-02-20T00:00:00Z"),
                recruitment("rct_5", 5, RecruitmentStatus.SCHEDULED, "2027-02-20T00:00:00Z"));

        assertThat(service.getCurrent().rid()).isEqualTo("rct_6");
    }

    @Test
    void 공개된_회차가_없으면_NOT_FOUND다() {
        RecruitmentService service = serviceWith(
                recruitment("rct_6", 6, RecruitmentStatus.DRAFT, "2027-02-20T00:00:00Z"));

        assertThatThrownBy(service::getCurrent)
                .isInstanceOf(ApiException.class)
                .hasMessage("모집 정보가 없습니다.")
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(CommonErrorCode.NOT_FOUND);
    }
}
