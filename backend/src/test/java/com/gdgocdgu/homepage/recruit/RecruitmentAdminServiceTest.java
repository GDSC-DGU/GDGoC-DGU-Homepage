package com.gdgocdgu.homepage.recruit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.common.error.CommonErrorCode;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** DB 없이 운영진 회차 목록의 정렬 · 페이지 규칙을 확인한다 (API-RCT-006). */
class RecruitmentAdminServiceTest {

    static final Instant NOW = Instant.parse("2027-02-25T00:00:00Z");

    static Recruitment recruitment(int cohort, RecruitmentStatus status, Integer publishedFormVersion) {
        return new Recruitment("rct_" + cohort, cohort, cohort + "기 모집", status, false,
                Instant.parse("2027-02-19T15:00:00Z"), Instant.parse("2027-03-05T14:59:59Z"),
                List.of("BE"), "안내", publishedFormVersion, null);
    }

    final List<NewRecruitment> created = new ArrayList<>();
    boolean cohortTaken;

    RecruitmentAdminService serviceWith(List<Recruitment> recruitments, Map<String, Long> counts) {
        ApplicationCountRepository applicationCounts = rid -> counts.getOrDefault(rid, 0L);
        RecruitmentAdminRepository adminRepository = new RecruitmentAdminRepository() {
            @Override
            public boolean create(NewRecruitment recruitment) {
                created.add(recruitment);
                return !cohortTaken;
            }

            @Override
            public Recruitment update(String rid, RecruitmentUpdater updater, String actorId, Instant now) {
                throw new UnsupportedOperationException("에뮬레이터 테스트에서 확인한다");
            }
        };
        return new RecruitmentAdminService(new InMemoryRecruitmentRepository(recruitments), applicationCounts,
                adminRepository, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    static CreateRecruitmentRequest createRequest(Integer cohort, String start, String end, List<String> tracks) {
        return new CreateRecruitmentRequest(cohort, " GDGoC DGU 5기 멤버 모집 ", start, end, tracks, "모집 안내 본문");
    }

    @Test
    void 생성하면_DRAFT_회차를_만들고_rct_기수_ID를_돌려준다() {
        CreatedRecruitmentResponse response = serviceWith(List.of(), Map.of()).create(
                createRequest(5, "2027-02-20T00:00:00+09:00", "2027-03-05T23:59:59+09:00", List.of("BE", "FE")),
                "usr_admin");

        assertThat(response).isEqualTo(new CreatedRecruitmentResponse("rct_5", 5, "DRAFT"));
        NewRecruitment recruitment = created.getFirst();
        assertThat(recruitment.title()).isEqualTo("GDGoC DGU 5기 멤버 모집");
        assertThat(recruitment.applyStartAt()).isEqualTo(Instant.parse("2027-02-19T15:00:00Z"));
        assertThat(recruitment.createdBy()).isEqualTo("usr_admin");
        assertThat(recruitment.createdAt()).isEqualTo(NOW);
    }

    @Test
    void 같은_기수가_있으면_COHORT_EXISTS다() {
        cohortTaken = true;
        RecruitmentAdminService service = serviceWith(List.of(), Map.of());

        assertThatThrownBy(() -> service.create(createRequest(5, "2027-02-20T00:00:00+09:00",
                "2027-03-05T23:59:59+09:00", List.of("BE")), "usr_admin"))
                .isInstanceOf(ApiException.class)
                .hasMessage("5기 모집 회차가 이미 있습니다.")
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(RecruitErrorCode.COHORT_EXISTS);
    }

    @Test
    void 기수_기간_트랙이_잘못되면_만들지_않고_VALIDATION_FAILED다() {
        RecruitmentAdminService service = serviceWith(List.of(), Map.of());
        List<CreateRecruitmentRequest> invalid = List.of(
                createRequest(0, "2027-02-20T00:00:00+09:00", "2027-03-05T23:59:59+09:00", List.of("BE")),
                createRequest(null, "2027-02-20T00:00:00+09:00", "2027-03-05T23:59:59+09:00", List.of("BE")),
                createRequest(5, "2027-03-06T00:00:00+09:00", "2027-03-05T23:59:59+09:00", List.of("BE")),
                createRequest(5, null, "2027-03-05T23:59:59+09:00", List.of("BE")),
                createRequest(5, "2027-02-20T00:00:00+09:00", "2027-03-05T23:59:59+09:00", List.of()),
                new CreateRecruitmentRequest(5, " ", "2027-02-20T00:00:00+09:00", "2027-03-05T23:59:59+09:00",
                        List.of("BE"), null));
        for (CreateRecruitmentRequest request : invalid) {
            assertThatThrownBy(() -> service.create(request, "usr_admin"))
                    .isInstanceOf(ApiException.class)
                    .extracting(e -> ((ApiException) e).getErrorCode())
                    .isEqualTo(CommonErrorCode.VALIDATION_FAILED);
        }
        assertThat(created).isEmpty();
    }

    @Test
    void DRAFT까지_최신_기수_순으로_돌려주고_지원_상태와_지원자_수를_계산한다() {
        RecruitmentAdminService service = serviceWith(List.of(
                recruitment(4, RecruitmentStatus.CLOSED, 2),
                recruitment(6, RecruitmentStatus.DRAFT, null),
                recruitment(5, RecruitmentStatus.OPEN, 3)), Map.of("rct_5", 120L));

        RecruitmentListResponse response = service.list(null, null);

        assertThat(response.recruitments()).extracting(RecruitmentSummary::rid)
                .containsExactly("rct_6", "rct_5", "rct_4");
        RecruitmentSummary rct5 = response.recruitments().get(1);
        assertThat(rct5.status()).isEqualTo("OPEN");
        assertThat(rct5.applyState()).isEqualTo("OPEN");
        assertThat(rct5.applicationCount()).isEqualTo(120);
        assertThat(rct5.applyStartAt()).isEqualTo("2027-02-20T00:00:00+09:00");
        assertThat(response.recruitments().getFirst().applyState()).isEqualTo("NOT_PUBLISHED");
        assertThat(response.pagination()).isEqualTo(new Pagination(1, 20, 3, 1));
    }

    @Test
    void 요청한_페이지만_잘라_돌려준다() {
        List<Recruitment> recruitments = new ArrayList<>();
        for (int cohort = 1; cohort <= 25; cohort++) {
            recruitments.add(recruitment(cohort, RecruitmentStatus.CLOSED, 1));
        }
        RecruitmentAdminService service = serviceWith(recruitments, Map.of());

        RecruitmentListResponse second = service.list(2, 20);

        assertThat(second.recruitments()).extracting(RecruitmentSummary::cohort).containsExactly(5, 4, 3, 2, 1);
        assertThat(second.pagination()).isEqualTo(new Pagination(2, 20, 25, 2));
        assertThat(service.list(3, 20).recruitments()).isEmpty();
    }

    @Test
    void 회차가_없으면_빈_목록과_0페이지다() {
        RecruitmentListResponse response = serviceWith(List.of(), Map.of()).list(1, 20);

        assertThat(response.recruitments()).isEmpty();
        assertThat(response.pagination()).isEqualTo(new Pagination(1, 20, 0, 0));
    }

    @ParameterizedTest
    @CsvSource({"0,20", "-1,20", "1,0", "1,101"})
    void 페이지_값이_범위를_벗어나면_VALIDATION_FAILED다(int page, int pageSize) {
        RecruitmentAdminService service = serviceWith(List.of(), Map.of());

        assertThatThrownBy(() -> service.list(page, pageSize))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(CommonErrorCode.VALIDATION_FAILED);
    }
}
