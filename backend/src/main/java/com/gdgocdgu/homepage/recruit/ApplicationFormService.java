package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.error.ApiException;
import org.springframework.stereotype.Service;

@Service
public class ApplicationFormService {

    private final RecruitmentRepository recruitmentRepository;
    private final FormVersionRepository formVersionRepository;

    public ApplicationFormService(RecruitmentRepository recruitmentRepository,
            FormVersionRepository formVersionRepository) {
        this.recruitmentRepository = recruitmentRepository;
        this.formVersionRepository = formVersionRepository;
    }

    /**
     * API-RCT-002. 공개 회차의 게시된 버전만 돌려준다.
     * 없는 회차와 DRAFT 회차를 같은 응답으로 처리해 비공개 회차의 존재를 드러내지 않는다.
     */
    public ApplicationFormResponse getPublishedForm(String rid) {
        Recruitment recruitment = recruitmentRepository.findById(rid)
                .filter(Recruitment::isPublic)
                .filter(found -> found.publishedFormVersion() != null)
                .orElseThrow(() -> new ApiException(RecruitErrorCode.FORM_NOT_PUBLISHED));
        int version = recruitment.publishedFormVersion();
        ApplicationForm form = formVersionRepository.find(rid, version)
                .orElseThrow(() -> new IllegalStateException(
                        "recruitments/" + rid + " 의 게시 폼 버전 " + version + " 문서가 없습니다."));
        return ApplicationFormResponse.of(rid, form);
    }
}
