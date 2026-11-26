package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.auth.AdminOnly;
import com.gdgocdgu.homepage.auth.AuthenticatedMember;
import com.gdgocdgu.homepage.common.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** 운영진 모집 회차 API. 권한: 운영진(ADMIN). */
@AdminOnly
@RestController
@RequestMapping("/api/v1/admin/recruitments")
public class AdminRecruitmentController {

    private final RecruitmentAdminService recruitmentAdminService;

    public AdminRecruitmentController(RecruitmentAdminService recruitmentAdminService) {
        this.recruitmentAdminService = recruitmentAdminService;
    }

    /** API-RCT-006 모집 회차 목록 */
    @GetMapping
    public ApiResponse<RecruitmentListResponse> list(@RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        return ApiResponse.ok(recruitmentAdminService.list(page, pageSize));
    }

    /** API-RCT-007 모집 회차 생성 */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CreatedRecruitmentResponse> create(@RequestBody CreateRecruitmentRequest request,
            AuthenticatedMember member) {
        return ApiResponse.ok(recruitmentAdminService.create(request, member.userId()));
    }

    /** API-RCT-008 모집 회차 수정 · 상태 변경 */
    @PatchMapping("/{rid}")
    public ApiResponse<RecruitmentDetailResponse> update(@PathVariable String rid,
            @RequestBody UpdateRecruitmentRequest request, AuthenticatedMember member) {
        return ApiResponse.ok(recruitmentAdminService.update(rid, request, member.userId()));
    }
}
