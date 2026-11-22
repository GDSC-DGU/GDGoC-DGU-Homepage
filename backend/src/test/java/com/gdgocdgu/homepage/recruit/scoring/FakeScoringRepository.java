package com.gdgocdgu.homepage.recruit.scoring;

import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.Finished;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.RetryResult;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.ScoredResult;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.ScoringInput;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.StartResult;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.Started;
import java.util.HashMap;
import java.util.Map;

/** 서비스 테스트용 메모리 저장소. 실제 구현과 같은 상태 전이 · runId 확인 규칙을 따른다. */
class FakeScoringRepository implements ScoringRepository {

    static class Doc {
        boolean deleted;
        String status = "PENDING";
        int criteriaVersion = 1;
        String runId;
        long attempts;
        String error;
        ScoredResult result;
        /** null이 아니면 시작할 때 입력 문서 오류로 FAILED 처리한다. */
        String inputError;
    }

    final Map<String, Doc> docs = new HashMap<>();
    ScoringInput input;
    /** 시작 직후 실행 번호를 바꿔 "AI 호출 중에 다른 실행이 시작된" 상황을 만든다. */
    boolean takeOverAfterStart;

    Doc add(String aid) {
        Doc doc = new Doc();
        docs.put(aid, doc);
        return doc;
    }

    @Override
    public StartResult start(String aid, int criteriaVersion, String runId) {
        Doc doc = docs.get(aid);
        if (doc == null || doc.deleted || doc.criteriaVersion != criteriaVersion) {
            return new Finished(ScoringStatus.SKIPPED_STALE);
        }
        switch (doc.status) {
            case "RUNNING": return new Finished(ScoringStatus.RUNNING);
            case "DONE": return new Finished(ScoringStatus.DONE);
            case "FAILED": return new Finished(ScoringStatus.FAILED);
            default: break;
        }
        if (doc.inputError != null) {
            doc.status = "FAILED";
            doc.error = doc.inputError;
            return new Finished(ScoringStatus.FAILED);
        }
        doc.status = "RUNNING";
        doc.runId = runId;
        doc.error = null;
        if (takeOverAfterStart) {
            doc.runId = "other-run";
        }
        return new Started(input);
    }

    private Doc current(String aid, int criteriaVersion, String runId) {
        Doc doc = docs.get(aid);
        return doc != null && !doc.deleted && doc.criteriaVersion == criteriaVersion && runId.equals(doc.runId)
                ? doc : null;
    }

    @Override
    public boolean saveDone(String aid, int criteriaVersion, String runId, ScoredResult result) {
        Doc doc = current(aid, criteriaVersion, runId);
        if (doc == null) {
            return false;
        }
        doc.status = "DONE";
        doc.result = result;
        doc.error = null;
        return true;
    }

    @Override
    public boolean saveFailed(String aid, int criteriaVersion, String runId, String errorCode) {
        Doc doc = current(aid, criteriaVersion, runId);
        if (doc == null) {
            return false;
        }
        doc.status = "FAILED";
        doc.runId = null;
        doc.error = errorCode;
        return true;
    }

    @Override
    public RetryResult releaseForRetry(String aid, int criteriaVersion, String runId, String errorCode, int max) {
        Doc doc = current(aid, criteriaVersion, runId);
        if (doc == null) {
            return RetryResult.STALE;
        }
        doc.attempts++;
        doc.runId = null;
        if (doc.attempts > max) {
            doc.status = "FAILED";
            doc.error = ScoringService.ERROR_AI_UNAVAILABLE;
            return RetryResult.FAILED;
        }
        doc.status = "PENDING";
        doc.error = errorCode;
        return RetryResult.RETRY;
    }
}
