package com.gdgocdgu.homepage.recruit.scoring;

import com.gdgocdgu.homepage.common.response.ApiResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * [API-RCT-031] 멈춘 채점 재처리. Cloud Scheduler(서비스 계정)만 호출한다.
 * 인증은 {@code /internal/**} 필터(InternalAuthFilter)가 맡는다.
 */
@RestController
@RequestMapping("/internal/jobs/scoring-recovery")
public class ScoringRecoveryController {

    private final ScoringRecoveryService recoveryService;

    ScoringRecoveryController(ScoringRecoveryService recoveryService) {
        this.recoveryService = recoveryService;
    }

    @PostMapping
    ApiResponse<RequeueResponse> recover() {
        return ApiResponse.ok(new RequeueResponse(recoveryService.recover()));
    }

    /** 응답 {@code data}. */
    record RequeueResponse(int requeued) {
    }
}
