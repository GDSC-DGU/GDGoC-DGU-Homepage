package com.gdgocdgu.homepage.recruit.scoring;

import com.gdgocdgu.homepage.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * [API-RCT-028] 지원서 AI 채점. Cloud Tasks(tasks-invoker 서비스 계정)만 호출한다.
 * 인증은 {@code /internal/**} 필터(InternalAuthFilter)가 맡는다.
 */
@RestController
@RequestMapping("/internal/scoring")
public class ScoringController {

    private final ScoringService scoringService;

    ScoringController(ScoringService scoringService) {
        this.scoringService = scoringService;
    }

    @PostMapping
    ApiResponse<ScoringResponse> score(@Valid @RequestBody ScoringRequest request) {
        ScoringStatus status = scoringService.score(request.aid(), request.criteriaVersion());
        return ApiResponse.ok(new ScoringResponse(request.aid(), status));
    }
}
