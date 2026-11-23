package com.gdgocdgu.homepage.recruit.scoring;

import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.RetryResult;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.ScoredResult;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.StartResult;

/**
 * 채점 상태 저장소. 메서드 하나가 Firestore 트랜잭션 하나다.
 * 결과 · 실패 저장은 모두 {@code criteriaVersion}과 {@code runId}가 지금 문서와 같을 때만 쓰고,
 * 다르면 쓰지 않는다(늦게 끝난 이전 실행의 결과를 버린다).
 */
interface ScoringRepository {

    /**
     * 채점을 시작한다. PENDING이면 RUNNING + {@code runId}로 바꾸고 AI 호출에 필요한 입력을 읽어 돌려준다.
     * 그 밖의 상태, 오래된 요청, 입력 문서 오류는 {@link ScoringModels.Finished}로 돌려준다.
     */
    StartResult start(String aid, int criteriaVersion, String runId);

    /** 결과를 DONE으로 저장한다. 저장했으면 true, 오래된 실행이라 버렸으면 false. */
    boolean saveDone(String aid, int criteriaVersion, String runId, ScoredResult result);

    /** 영구 실패를 FAILED로 저장한다. 저장했으면 true, 오래된 실행이라 버렸으면 false. */
    boolean saveFailed(String aid, int criteriaVersion, String runId, String errorCode);

    /**
     * 일시 실패를 기록한다. attempts를 1 올리고, {@code maxAttempts}를 넘으면 FAILED,
     * 아니면 PENDING으로 되돌린다(RUNNING으로 두면 재시도가 "이미 RUNNING"에 걸린다).
     */
    RetryResult releaseForRetry(String aid, int criteriaVersion, String runId, String errorCode, int maxAttempts);
}
