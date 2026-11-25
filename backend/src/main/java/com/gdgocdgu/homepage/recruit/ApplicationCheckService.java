package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.common.error.CommonErrorCode;
import org.springframework.stereotype.Service;

@Service
public class ApplicationCheckService {

    private final RecruitmentRepository recruitmentRepository;
    private final ApplicationKeyRepository applicationKeyRepository;
    private final ApplicationKeyGenerator applicationKeyGenerator;

    public ApplicationCheckService(RecruitmentRepository recruitmentRepository,
            ApplicationKeyRepository applicationKeyRepository, ApplicationKeyGenerator applicationKeyGenerator) {
        this.recruitmentRepository = recruitmentRepository;
        this.applicationKeyRepository = applicationKeyRepository;
        this.applicationKeyGenerator = applicationKeyGenerator;
    }

    /**
     * API-RCT-003. 학번만 확인한다(이메일 중복은 RCT-005).
     * 없는 회차와 DRAFT 회차는 중복 없음으로 답해 비공개 회차의 존재를 드러내지 않는다. 실제 제출은 RCT-005가 막는다.
     */
    public DuplicateCheckResponse check(String rid, String studentId) {
        String normalized = normalizeStudentId(studentId);
        boolean publicRecruitment = recruitmentRepository.findById(rid).filter(Recruitment::isPublic).isPresent();
        if (!publicRecruitment) {
            return new DuplicateCheckResponse(false);
        }
        String keyId = applicationKeyGenerator.studentIdKey(normalized);
        return new DuplicateCheckResponse(applicationKeyRepository.exists(rid, keyId));
    }

    private static String normalizeStudentId(String studentId) {
        String normalized = ApplicantNormalizer.studentId(studentId);
        if (normalized == null) {
            throw new ApiException(CommonErrorCode.VALIDATION_FAILED, "학번 형식이 올바르지 않습니다.");
        }
        return normalized;
    }
}
