package com.gdgocdgu.homepage.recruit.scoring;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.recruit.scoring.GradingClient.GradingOutcome;
import com.gdgocdgu.homepage.recruit.scoring.GradingClient.GradingRequest;
import com.gdgocdgu.homepage.recruit.scoring.GradingClient.Permanent;
import com.gdgocdgu.homepage.recruit.scoring.GradingClient.Success;
import com.gdgocdgu.homepage.recruit.scoring.GradingClient.Transient;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.Finished;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.RetryResult;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.ScoredResult;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.Started;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.StartResult;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * 지원서 1건 채점 (API-RCT-028).
 *
 * <p>흐름: 시작 트랜잭션(PENDING → RUNNING) → AI 호출(트랜잭션 밖) → 결과 저장 트랜잭션(runId 확인).
 * AI 호출을 트랜잭션 밖에 두는 것은 트랜잭션 재시도마다 AI를 다시 부르지 않기 위해서다.
 *
 * <p>시간 제한은 안쪽이 바깥보다 짧아야 한다: AI 읽기 90초 &lt; backend 120초 &lt; Cloud Run 요청 180초
 * &lt; Cloud Tasks 마감 240초. 바깥이 먼저 끊기면 RUNNING이 남고 RCT-031이 10분 뒤에 되돌린다.
 *
 * <p>로그에는 aid, 기준 버전, runId, 상태, 오류 코드만 남긴다. 답안 · 기준 문구 · AI 사유 · 토큰은 남기지 않는다.
 */
@Service
class ScoringService {

    private static final Logger log = LoggerFactory.getLogger(ScoringService.class);

    /** 일시 실패를 이 횟수까지 다시 시도하고, 넘으면 FAILED. */
    static final int MAX_ATTEMPTS = 3;

    static final String ERROR_AI_OUTPUT_INVALID = "AI_OUTPUT_INVALID";
    static final String ERROR_AI_UNAVAILABLE = "AI_UNAVAILABLE";

    private final ScoringRepository repository;
    private final GradingClient gradingClient;

    ScoringService(ScoringRepository repository, GradingClient gradingClient) {
        this.repository = repository;
        this.gradingClient = gradingClient;
    }

    /**
     * 채점을 실행하고 지원서의 채점 상태를 돌려준다.
     *
     * @throws ApiException {@code SCORING_RETRY}(503): AI 일시 실패로 PENDING으로 되돌렸다. Cloud Tasks가 다시 보낸다.
     */
    ScoringStatus score(String aid, int criteriaVersion) {
        String runId = UUID.randomUUID().toString();
        StartResult start = repository.start(aid, criteriaVersion, runId);
        if (start instanceof Finished finished) {
            log.info("채점 건너뜀: aid={}, criteriaVersion={}, status={}", aid, criteriaVersion, finished.status());
            return finished.status();
        }
        ScoringModels.ScoringInput input = ((Started) start).input();

        GradingRequest request;
        try {
            request = GradingRequestBuilder.build(aid, input);
        } catch (InvalidScoringInputException e) {
            // 메시지에는 오류 코드와 어떤 제한인지만 있다(답안 · 기준 문구 없음).
            log.warn("채점 입력 검증 실패: aid={}, criteriaVersion={}, {}", aid, criteriaVersion, e.getMessage());
            return failPermanently(aid, criteriaVersion, runId, e.errorCode());
        }

        GradingOutcome outcome = gradingClient.grade(request);
        if (outcome instanceof Success success) {
            if (!ScoreCalculator.isValid(input.items(), success.response())) {
                return handleTransient(aid, criteriaVersion, runId, ERROR_AI_OUTPUT_INVALID);
            }
            ScoredResult result = ScoreCalculator.score(input.items(), success.response());
            if (!repository.saveDone(aid, criteriaVersion, runId, result)) {
                return discarded(aid, criteriaVersion, runId);
            }
            log.info("채점 완료: aid={}, criteriaVersion={}, runId={}", aid, criteriaVersion, runId);
            return ScoringStatus.DONE;
        }
        if (outcome instanceof Permanent permanent) {
            return failPermanently(aid, criteriaVersion, runId, permanent.errorCode());
        }
        return handleTransient(aid, criteriaVersion, runId, ((Transient) outcome).errorCode());
    }

    private ScoringStatus failPermanently(String aid, int criteriaVersion, String runId, String errorCode) {
        if (!repository.saveFailed(aid, criteriaVersion, runId, errorCode)) {
            return discarded(aid, criteriaVersion, runId);
        }
        log.warn("채점 실패(영구): aid={}, criteriaVersion={}, runId={}, error={}",
                aid, criteriaVersion, runId, errorCode);
        return ScoringStatus.FAILED;
    }

    private ScoringStatus handleTransient(String aid, int criteriaVersion, String runId, String errorCode) {
        RetryResult result = repository.releaseForRetry(aid, criteriaVersion, runId, errorCode, MAX_ATTEMPTS);
        switch (result) {
            case STALE:
                return discarded(aid, criteriaVersion, runId);
            case FAILED:
                log.warn("채점 실패(재시도 횟수 초과): aid={}, criteriaVersion={}, runId={}, error={}",
                        aid, criteriaVersion, runId, errorCode);
                return ScoringStatus.FAILED;
            default:
                log.warn("채점 일시 실패, 재시도 요청: aid={}, criteriaVersion={}, runId={}, error={}",
                        aid, criteriaVersion, runId, errorCode);
                throw new ApiException(RecruitScoringErrorCode.SCORING_RETRY);
        }
    }

    private ScoringStatus discarded(String aid, int criteriaVersion, String runId) {
        log.warn("오래된 채점 결과 버림: aid={}, criteriaVersion={}, runId={}", aid, criteriaVersion, runId);
        return ScoringStatus.SKIPPED_STALE;
    }
}
