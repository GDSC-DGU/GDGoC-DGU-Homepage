package com.gdgocdgu.homepage.recruit;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class RecruitmentTest {

    static final Instant START = Instant.parse("2027-02-19T15:00:00Z"); // 2027-02-20 00:00 KST
    static final Instant END = Instant.parse("2027-03-05T14:59:59Z");   // 2027-03-05 23:59:59 KST

    static Recruitment recruitment(RecruitmentStatus status, boolean closedManually, Integer publishedFormVersion) {
        return new Recruitment("rct_5", 5, "GDGoC DGU 5기 멤버 모집", status, closedManually,
                START, END, List.of("BE", "FE"), "안내", publishedFormVersion, null);
    }

    @Test
    void 기간_안이고_폼이_게시되면_OPEN이다() {
        Recruitment r = recruitment(RecruitmentStatus.SCHEDULED, false, 3);

        assertThat(r.applyState(Instant.parse("2027-02-25T05:00:00Z"))).isEqualTo(ApplyState.OPEN);
        assertThat(r.applyState(Instant.parse("2027-02-25T05:00:00Z")).canApply()).isTrue();
    }

    @Test
    void 시작_시각과_종료_시각은_모두_접수_기간에_포함된다() {
        Recruitment r = recruitment(RecruitmentStatus.OPEN, false, 3);

        assertThat(r.applyState(START)).isEqualTo(ApplyState.OPEN);
        assertThat(r.applyState(END)).isEqualTo(ApplyState.OPEN);
    }

    @Test
    void 시작_1초_전은_BEFORE_START_종료_1초_후는_ENDED다() {
        Recruitment r = recruitment(RecruitmentStatus.OPEN, false, 3);

        assertThat(r.applyState(START.minusSeconds(1))).isEqualTo(ApplyState.BEFORE_START);
        assertThat(r.applyState(END.plusSeconds(1))).isEqualTo(ApplyState.ENDED);
    }

    @Test
    void 폼이_게시되지_않았으면_기간과_상관없이_NOT_PUBLISHED다() {
        Recruitment r = recruitment(RecruitmentStatus.SCHEDULED, false, null);

        assertThat(r.applyState(START)).isEqualTo(ApplyState.NOT_PUBLISHED);
    }

    @Test
    void DRAFT는_폼이_있어도_NOT_PUBLISHED다() {
        Recruitment r = recruitment(RecruitmentStatus.DRAFT, false, 3);

        assertThat(r.applyState(START)).isEqualTo(ApplyState.NOT_PUBLISHED);
        assertThat(r.isPublic()).isFalse();
    }

    @Test
    void 수동_마감은_기간_안이어도_CLOSED_MANUALLY다() {
        Recruitment r = recruitment(RecruitmentStatus.CLOSED, true, 3);

        assertThat(r.applyState(START)).isEqualTo(ApplyState.CLOSED_MANUALLY);
        assertThat(r.applyState(START).canApply()).isFalse();
    }
}
