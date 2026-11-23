package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 공개 모집 API. 권한: 공개(로그인 불필요). */
@RestController
@RequestMapping("/api/v1/recruitments")
public class RecruitmentController {

    private final RecruitmentService recruitmentService;
    private final ApplicationFormService applicationFormService;
    private final ApplicationCheckService applicationCheckService;

    public RecruitmentController(RecruitmentService recruitmentService,
            ApplicationFormService applicationFormService, ApplicationCheckService applicationCheckService) {
        this.recruitmentService = recruitmentService;
        this.applicationFormService = applicationFormService;
        this.applicationCheckService = applicationCheckService;
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

    /** API-RCT-003 중복 지원 사전 확인. 학번이 URL과 접근 로그에 남지 않게 Body로 받는다. */
    @PostMapping("/{rid}/applications/check")
    public ApiResponse<DuplicateCheckResponse> checkDuplicate(@PathVariable String rid,
            @RequestBody DuplicateCheckRequest request) {
        return ApiResponse.ok(applicationCheckService.check(rid, request.studentId()));
    }
}
