package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.common.error.CommonErrorCode;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

/** 운영진 모집 회차 관리 (API-RCT-006 ~ 008). 권한 검사는 컨트롤러의 {@code @AdminOnly}가 한다. */
@Service
public class RecruitmentAdminService {

    static final int DEFAULT_PAGE_SIZE = 20;
    static final int MAX_PAGE_SIZE = 100;

    private final RecruitmentRepository recruitmentRepository;
    private final ApplicationCountRepository applicationCountRepository;
    private final RecruitmentAdminRepository recruitmentAdminRepository;
    private final Clock clock;

    public RecruitmentAdminService(RecruitmentRepository recruitmentRepository,
            ApplicationCountRepository applicationCountRepository,
            RecruitmentAdminRepository recruitmentAdminRepository, Clock clock) {
        this.recruitmentRepository = recruitmentRepository;
        this.applicationCountRepository = applicationCountRepository;
        this.recruitmentAdminRepository = recruitmentAdminRepository;
        this.clock = clock;
    }

    /**
     * API-RCT-006. DRAFT를 포함한 모든 회차를 최신 기수 순으로 돌려준다.
     * 회차는 기수당 하나라 수가 적으므로 전부 읽어 메모리에서 자르고, 지원자 수는 이번 페이지 회차만 센다.
     */
    public RecruitmentListResponse list(Integer page, Integer pageSize) {
        int pageNumber = page == null ? 1 : page;
        int size = pageSize == null ? DEFAULT_PAGE_SIZE : pageSize;
        if (pageNumber < 1 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new ApiException(CommonErrorCode.VALIDATION_FAILED, "입력 값을 확인해주세요.");
        }
        Instant now = clock.instant();
        List<Recruitment> all = recruitmentRepository.findAll().stream()
                .sorted(Comparator.comparingInt(Recruitment::cohort).reversed())
                .toList();
        List<RecruitmentSummary> items = all.stream()
                .skip((long) (pageNumber - 1) * size)
                .limit(size)
                .map(recruitment -> RecruitmentSummary.of(recruitment, now,
                        applicationCountRepository.countActive(recruitment.rid())))
                .toList();
        return new RecruitmentListResponse(items, Pagination.of(pageNumber, size, all.size()));
    }

    /** API-RCT-007. 기수당 회차 하나라 ID는 rct_{cohort}이고, DRAFT로 만든다. */
    public CreatedRecruitmentResponse create(CreateRecruitmentRequest request, String actorId) {
        if (request == null) {
            throw RecruitmentInputs.invalid();
        }
        int cohort = RecruitmentInputs.cohort(request.cohort());
        String title = RecruitmentInputs.title(request.title());
        Instant start = RecruitmentInputs.instant(request.applyStartAt());
        Instant end = RecruitmentInputs.instant(request.applyEndAt());
        RecruitmentInputs.period(start, end);
        NewRecruitment recruitment = new NewRecruitment("rct_" + cohort, cohort, title, start, end,
                RecruitmentInputs.tracks(request.tracks()), RecruitmentInputs.notice(request.noticeMarkdown()),
                actorId, clock.instant());
        if (!recruitmentAdminRepository.create(recruitment)) {
            throw new ApiException(RecruitErrorCode.COHORT_EXISTS, cohort + "기 모집 회차가 이미 있습니다.");
        }
        return new CreatedRecruitmentResponse(recruitment.rid(), cohort, RecruitmentStatus.DRAFT.name());
    }

    /**
     * API-RCT-008. 규칙은 {@link RecruitmentUpdatePlanner}가 트랜잭션 안에서 저장된 회차를 기준으로 적용한다.
     * 모집 기간을 바꿨을 때 홈 일정(HOM)을 함께 바꾸는 연동은 아직 없다.
     */
    public RecruitmentDetailResponse update(String rid, UpdateRecruitmentRequest request, String actorId) {
        Instant now = clock.instant();
        Recruitment updated = recruitmentAdminRepository.update(rid,
                (current, membersRegistered) -> RecruitmentUpdatePlanner.apply(current, membersRegistered, request, now),
                actorId, now);
        return RecruitmentDetailResponse.of(updated, now);
    }
}
