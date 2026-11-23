package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 공개 모집 API. 권한: 공개(로그인 불필요). */
@RestController
@RequestMapping("/api/v1/recruitments")
public class RecruitmentController {

    private final RecruitmentService recruitmentService;

    public RecruitmentController(RecruitmentService recruitmentService) {
        this.recruitmentService = recruitmentService;
    }

    /** API-RCT-001 현재 모집 안내 조회 */
    @GetMapping("/current")
    public ApiResponse<CurrentRecruitmentResponse> current() {
        return ApiResponse.ok(recruitmentService.getCurrent());
    }
}
