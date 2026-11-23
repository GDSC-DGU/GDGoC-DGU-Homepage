package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.common.error.CommonErrorCode;
import java.time.Clock;
import java.util.Comparator;
import org.springframework.stereotype.Service;

@Service
public class RecruitmentService {

    /** 현재 회차 고르기 기준: 지원 시작일, 같으면 기수. 이 순서로 가장 큰(늦은) 회차를 고른다. */
    private static final Comparator<Recruitment> BY_START_THEN_COHORT =
            Comparator.comparing(Recruitment::applyStartAt).thenComparingInt(Recruitment::cohort);

    private final RecruitmentRepository recruitmentRepository;
    private final Clock clock;

    public RecruitmentService(RecruitmentRepository recruitmentRepository, Clock clock) {
        this.recruitmentRepository = recruitmentRepository;
        this.clock = clock;
    }

    /**
     * API-RCT-001. 현재 회차 = DRAFT가 아닌 회차 중 지원 시작일이 가장 늦은 회차.
     * 기간이 지나도 다음 회차가 생길 때까지 이 회차를 돌려준다. 회차가 하나도 없을 때만 404.
     */
    public CurrentRecruitmentResponse getCurrent() {
        Recruitment current = recruitmentRepository.findAll().stream()
                .filter(Recruitment::isPublic)
                .max(BY_START_THEN_COHORT)
                .orElseThrow(() -> new ApiException(CommonErrorCode.NOT_FOUND, "모집 정보가 없습니다."));
        return CurrentRecruitmentResponse.of(current, clock.instant());
    }
}
