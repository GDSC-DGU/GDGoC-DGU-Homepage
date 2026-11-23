package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 공개 모집 API. 권한: 공개(로그인 불필요). */
@RestController
@RequestMapping("/api/v1/recruitments")
public class RecruitmentController {

    private final RecruitmentService recruitmentService;
    private final ApplicationFormService applicationFormService;

    public RecruitmentController(RecruitmentService recruitmentService,
            ApplicationFormService applicationFormService) {
        this.recruitmentService = recruitmentService;
        this.applicationFormService = applicationFormService;
    }

    /** API-RCT-001 현재 모집 안내 조회 */
    @GetMapping("/current")
    public ApiResponse<CurrentRecruitmentResponse> current() {
        return ApiResponse.ok(recruitmentService.getCurrent());
    }

    /** API-RCT-002 지원폼 문항 조회 */
    @GetMapping("/{rid}/form")
    public ApiResponse<ApplicationFormResponse> form(@PathVariable String rid) {
        return ApiResponse.ok(applicationFormService.getPublishedForm(rid));
    }
}
