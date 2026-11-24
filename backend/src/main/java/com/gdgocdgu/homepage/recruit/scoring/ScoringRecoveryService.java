package com.gdgocdgu.homepage.recruit.scoring;

import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.RequeueOutcome;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.RequeueResult;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.StuckApplication;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.StuckKind;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * 멈춘 채점 재처리 (API-RCT-031). Cloud Scheduler가 모집 시즌에 10분마다 부른다.
 *
 * <p>PENDING(requestedAt) 5분 초과, RUNNING(startedAt) 10분 초과 지원서를 상태별로 최대 100건씩 찾는다.
 * 남은 건은 다음 실행(10분 뒤)이 처리한다. 지원서마다 트랜잭션을 따로 쓰고, 한 건이 실패해도 나머지를 계속한다.
 * 큐 등록은 트랜잭션이 커밋된 뒤에만 한다. 등록이 실패하면 PENDING + 새 requestedAt으로 남아 5분 뒤 다시 잡힌다.
 *
 * <p>로그에는 건수, aid, 상태, 예외 클래스 이름만 남긴다.
 */
@Service
class ScoringRecoveryService {

    private static final Logger log = LoggerFactory.getLogger(ScoringRecoveryService.class);

    static final Duration PENDING_THRESHOLD = Duration.ofMinutes(5);
    static final Duration RUNNING_THRESHOLD = Duration.ofMinutes(10);
    /** 상태별로 한 번에 처리하는 최대 건수. */
    static final int BATCH_LIMIT = 100;
    static final String ERROR_SCORING_TIMEOUT = "SCORING_TIMEOUT";

    private final ScoringRepository repository;
    private final ScoringTaskQueue taskQueue;
    private final Clock clock;

    ScoringRecoveryService(ScoringRepository repository, ScoringTaskQueue taskQueue, Clock clock) {
        this.repository = repository;
        this.taskQueue = taskQueue;
        this.clock = clock;
    }

    /** 멈춘 채점을 다시 큐에 넣고, 다시 넣은 건수를 돌려준다. 조회가 실패하면 예외를 그대로 던진다. */
    int recover() {
        Instant now = clock.instant();
        int requeued = 0;
        int failed = 0;
        int errors = 0;
        for (StuckKind kind : StuckKind.values()) {
            Instant cutoff = now.minus(kind == StuckKind.PENDING ? PENDING_THRESHOLD : RUNNING_THRESHOLD);
            List<StuckApplication> candidates = repository.findStuck(kind, cutoff, BATCH_LIMIT);
            for (StuckApplication candidate : candidates) {
                try {
                    RequeueResult result = repository.requeueIfStuck(
                            candidate.aid(), kind, cutoff, now, ScoringService.MAX_ATTEMPTS);
                    if (result.outcome() == RequeueOutcome.REQUEUED) {
                        taskQueue.enqueue(candidate.aid(), result.criteriaVersion());
                        requeued++;
                    } else if (result.outcome() == RequeueOutcome.FAILED) {
                        failed++;
                        log.warn("멈춘 채점이 시도 횟수를 넘겨 FAILED 처리: aid={}, status={}", candidate.aid(), kind);
                    }
                } catch (RuntimeException e) {
                    errors++;
                    log.error("멈춘 채점 재처리 실패: aid={}, status={}, error={}",
                            candidate.aid(), kind, e.getClass().getSimpleName());
                }
            }
        }
        log.info("멈춘 채점 재처리 완료: requeued={}, failed={}, errors={}", requeued, failed, errors);
        return requeued;
    }
}
