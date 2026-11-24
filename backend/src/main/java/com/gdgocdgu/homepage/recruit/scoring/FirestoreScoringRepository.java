package com.gdgocdgu.homepage.recruit.scoring;

import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.AnswerValue;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.CriteriaItem;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.Finished;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.RequeueOutcome;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.RequeueResult;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.RetryResult;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.ScoredItem;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.ScoredResult;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.ScoringInput;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.StartResult;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.Started;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.StuckApplication;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.StuckKind;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.Transaction;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Repository;

/**
 * {@link ScoringRepository}의 Firestore 구현. 경로와 필드는 RCT 데이터 모델
 * ({@code applications/{aid}.scoring}, {@code recruitments/{rid}/criteriaVersions · formVersions})을 따른다.
 * 지원자 개인정보({@code applicant})는 읽지 않는다. 문서 내용은 로그에 남기지 않는다.
 */
@Repository
class FirestoreScoringRepository implements ScoringRepository {

    private static final Logger log = LoggerFactory.getLogger(FirestoreScoringRepository.class);

    private static final String APPLICATIONS = "applications";
    private static final String RECRUITMENTS = "recruitments";

    private final Firestore firestore;

    FirestoreScoringRepository(@Lazy Firestore firestore) {
        this.firestore = firestore;
    }

    @Override
    public StartResult start(String aid, int criteriaVersion, String runId) {
        return inTransaction(tx -> {
            DocumentReference ref = firestore.collection(APPLICATIONS).document(aid);
            DocumentSnapshot app = tx.get(ref).get();
            if (!app.exists() || Boolean.TRUE.equals(app.getBoolean("deleted"))) {
                log.warn("채점 대상 지원서 없음 또는 삭제됨: aid={}", aid);
                return new Finished(ScoringStatus.SKIPPED_STALE);
            }
            Long storedVersion = app.getLong("scoring.criteriaVersion");
            if (storedVersion == null || storedVersion != criteriaVersion) {
                return new Finished(ScoringStatus.SKIPPED_STALE);
            }
            String status = app.getString("scoring.status");
            if ("RUNNING".equals(status)) {
                return new Finished(ScoringStatus.RUNNING);
            }
            if ("DONE".equals(status)) {
                return new Finished(ScoringStatus.DONE);
            }
            if ("FAILED".equals(status)) {
                return new Finished(ScoringStatus.FAILED);
            }
            if (!"PENDING".equals(status)) {
                throw new IllegalStateException("지원서의 채점 상태를 읽을 수 없습니다.");
            }

            // 읽기는 모두 쓰기보다 먼저 해야 한다. 입력 문서가 잘못됐으면 같은 트랜잭션에서 FAILED로 바꾼다.
            String errorCode = null;
            ScoringInput input = null;
            String rid = app.getString("rid");
            Long formVersion = app.getLong("formVersion");
            if (rid == null || rid.isBlank() || formVersion == null) {
                errorCode = "APPLICATION_INVALID";
            } else {
                DocumentSnapshot criteria = tx.get(versionRef(rid, "criteriaVersions", criteriaVersion)).get();
                DocumentSnapshot form = tx.get(versionRef(rid, "formVersions", formVersion)).get();
                if (!criteria.exists()) {
                    errorCode = "CRITERIA_NOT_FOUND";
                } else if (!form.exists()) {
                    errorCode = "FORM_NOT_FOUND";
                } else {
                    try {
                        input = new ScoringInput(readItems(criteria), readAnswers(app), readQuestionTitles(form));
                    } catch (MalformedDocumentException e) {
                        errorCode = e.errorCode;
                    }
                }
            }

            if (errorCode != null) {
                log.warn("채점 입력 문서 오류: aid={}, criteriaVersion={}, error={}", aid, criteriaVersion, errorCode);
                tx.update(ref, failedFields(errorCode));
                return new Finished(ScoringStatus.FAILED);
            }

            Map<String, Object> fields = new HashMap<>();
            fields.put("scoring.status", "RUNNING");
            fields.put("scoring.runId", runId);
            fields.put("scoring.startedAt", Timestamp.now());
            fields.put("scoring.error", null);
            tx.update(ref, fields);
            return new Started(input);
        });
    }

    @Override
    public boolean saveDone(String aid, int criteriaVersion, String runId, ScoredResult result) {
        return inTransaction(tx -> {
            DocumentReference ref = firestore.collection(APPLICATIONS).document(aid);
            if (!isCurrentRun(tx.get(ref).get(), criteriaVersion, runId)) {
                return false;
            }
            List<Map<String, Object>> items = new ArrayList<>();
            for (ScoredItem item : result.items()) {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("itemId", item.itemId());
                map.put("name", item.name());
                map.put("level", item.level());
                map.put("weight", item.weight());
                map.put("score", item.score());
                map.put("reason", item.reason());
                items.add(map);
            }
            Map<String, Object> fields = new HashMap<>();
            fields.put("scoring.status", "DONE");
            fields.put("scoring.items", items);
            fields.put("scoring.totalScore", result.totalScore());
            fields.put("scoring.model", result.model());
            fields.put("scoring.promptVersion", result.promptVersion());
            fields.put("scoring.instructionIgnored", result.instructionIgnored());
            fields.put("scoring.scoredAt", Timestamp.now());
            fields.put("scoring.error", null);
            tx.update(ref, fields);
            return true;
        });
    }

    @Override
    public boolean saveFailed(String aid, int criteriaVersion, String runId, String errorCode) {
        return inTransaction(tx -> {
            DocumentReference ref = firestore.collection(APPLICATIONS).document(aid);
            if (!isCurrentRun(tx.get(ref).get(), criteriaVersion, runId)) {
                return false;
            }
            tx.update(ref, failedFields(errorCode));
            return true;
        });
    }

    @Override
    public RetryResult releaseForRetry(
            String aid, int criteriaVersion, String runId, String errorCode, int maxAttempts) {
        return inTransaction(tx -> {
            DocumentReference ref = firestore.collection(APPLICATIONS).document(aid);
            DocumentSnapshot app = tx.get(ref).get();
            if (!isCurrentRun(app, criteriaVersion, runId)) {
                return RetryResult.STALE;
            }
            Long stored = app.getLong("scoring.attempts");
            long attempts = (stored == null ? 0 : stored) + 1;

            Map<String, Object> fields = new HashMap<>();
            fields.put("scoring.attempts", attempts);
            fields.put("scoring.runId", null);
            if (attempts > maxAttempts) {
                fields.put("scoring.status", "FAILED");
                fields.put("scoring.error", ScoringService.ERROR_AI_UNAVAILABLE);
                tx.update(ref, fields);
                return RetryResult.FAILED;
            }
            fields.put("scoring.status", "PENDING");
            fields.put("scoring.error", errorCode);
            tx.update(ref, fields);
            return RetryResult.RETRY;
        });
    }

    @Override
    public List<StuckApplication> findStuck(StuckKind kind, Instant cutoff, int limit) {
        try {
            Query query = firestore.collection(APPLICATIONS)
                    .whereEqualTo("scoring.status", kind.status)
                    .whereLessThan(kind.timeField, toTimestamp(cutoff))
                    .orderBy(kind.timeField)
                    .limit(limit);
            List<StuckApplication> found = new ArrayList<>();
            for (QueryDocumentSnapshot doc : query.get().get().getDocuments()) {
                found.add(new StuckApplication(doc.getId(), kind));
            }
            return found;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("멈춘 채점 조회가 중단됐습니다.");
        } catch (ExecutionException e) {
            throw new IllegalStateException("멈춘 채점 조회에 실패했습니다: "
                    + (e.getCause() == null ? "unknown" : e.getCause().getClass().getSimpleName()));
        }
    }

    @Override
    public RequeueResult requeueIfStuck(String aid, StuckKind kind, Instant cutoff, Instant now, int maxAttempts) {
        RequeueResult skipped = new RequeueResult(RequeueOutcome.SKIPPED, 0);
        return inTransaction(tx -> {
            DocumentReference ref = firestore.collection(APPLICATIONS).document(aid);
            DocumentSnapshot app = tx.get(ref).get();
            if (!app.exists() || Boolean.TRUE.equals(app.getBoolean("deleted"))) {
                return skipped;
            }
            Timestamp time = app.getTimestamp(kind.timeField);
            Long criteriaVersion = app.getLong("scoring.criteriaVersion");
            if (!kind.status.equals(app.getString("scoring.status")) || time == null
                    || time.compareTo(toTimestamp(cutoff)) >= 0 || criteriaVersion == null) {
                return skipped;
            }

            Map<String, Object> fields = new HashMap<>();
            fields.put("scoring.runId", null);
            if (kind == StuckKind.RUNNING) {
                Long stored = app.getLong("scoring.attempts");
                long attempts = (stored == null ? 0 : stored) + 1;
                fields.put("scoring.attempts", attempts);
                if (attempts > maxAttempts) {
                    fields.put("scoring.status", "FAILED");
                    fields.put("scoring.error", ScoringRecoveryService.ERROR_SCORING_TIMEOUT);
                    tx.update(ref, fields);
                    return new RequeueResult(RequeueOutcome.FAILED, 0);
                }
            }
            fields.put("scoring.status", "PENDING");
            fields.put("scoring.requestedAt", toTimestamp(now));
            tx.update(ref, fields);
            return new RequeueResult(RequeueOutcome.REQUEUED, criteriaVersion.intValue());
        });
    }

    private static Timestamp toTimestamp(Instant instant) {
        return Timestamp.ofTimeSecondsAndNanos(instant.getEpochSecond(), instant.getNano());
    }

    /** 문서가 있고 삭제되지 않았으며, 기준 버전과 실행 번호가 이번 실행과 같으면 true. */
    private static boolean isCurrentRun(DocumentSnapshot app, int criteriaVersion, String runId) {
        if (!app.exists() || Boolean.TRUE.equals(app.getBoolean("deleted"))) {
            return false;
        }
        Long storedVersion = app.getLong("scoring.criteriaVersion");
        return storedVersion != null && storedVersion == criteriaVersion
                && runId.equals(app.getString("scoring.runId"));
    }

    private static Map<String, Object> failedFields(String errorCode) {
        Map<String, Object> fields = new HashMap<>();
        fields.put("scoring.status", "FAILED");
        fields.put("scoring.runId", null);
        fields.put("scoring.error", errorCode);
        return fields;
    }

    private DocumentReference versionRef(String rid, String collection, long version) {
        return firestore.collection(RECRUITMENTS).document(rid).collection(collection).document(String.valueOf(version));
    }

    private static List<CriteriaItem> readItems(DocumentSnapshot criteria) {
        List<Map<String, Object>> raw = mapList(criteria.get("items"), "CRITERIA_INVALID");
        if (raw.isEmpty()) {
            throw new MalformedDocumentException("CRITERIA_INVALID");
        }
        List<CriteriaItem> items = new ArrayList<>();
        for (Map<String, Object> map : raw) {
            Object weight = map.get("weight");
            if (!(weight instanceof Number number) || number.doubleValue() != Math.rint(number.doubleValue())
                    || number.longValue() < 0 || number.longValue() > 100) {
                throw new MalformedDocumentException("CRITERIA_INVALID");
            }
            items.add(new CriteriaItem(
                    requiredString(map, "itemId", "CRITERIA_INVALID"),
                    requiredString(map, "name", "CRITERIA_INVALID"),
                    stringList(map.get("questionIds"), "CRITERIA_INVALID"),
                    requiredString(map, "guide", "CRITERIA_INVALID"),
                    number.intValue()));
        }
        return items;
    }

    private static List<AnswerValue> readAnswers(DocumentSnapshot app) {
        Object raw = app.get("answers");
        if (raw == null) {
            return List.of();
        }
        List<AnswerValue> answers = new ArrayList<>();
        for (Map<String, Object> map : mapList(raw, "APPLICATION_INVALID")) {
            Object value = map.get("value");
            Object values = map.get("values");
            answers.add(new AnswerValue(
                    requiredString(map, "questionId", "APPLICATION_INVALID"),
                    value instanceof String s ? s : null,
                    values == null ? null : stringList(values, "APPLICATION_INVALID")));
        }
        return answers;
    }

    private static Map<String, String> readQuestionTitles(DocumentSnapshot form) {
        Map<String, String> titles = new HashMap<>();
        for (Map<String, Object> map : mapList(form.get("questions"), "FORM_INVALID")) {
            titles.put(requiredString(map, "questionId", "FORM_INVALID"), requiredString(map, "title", "FORM_INVALID"));
        }
        return titles;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> mapList(Object raw, String errorCode) {
        if (!(raw instanceof List<?> list)) {
            throw new MalformedDocumentException(errorCode);
        }
        for (Object element : list) {
            if (!(element instanceof Map<?, ?>)) {
                throw new MalformedDocumentException(errorCode);
            }
        }
        return (List<Map<String, Object>>) list;
    }

    private static List<String> stringList(Object raw, String errorCode) {
        if (!(raw instanceof List<?> list)) {
            throw new MalformedDocumentException(errorCode);
        }
        List<String> strings = new ArrayList<>();
        for (Object element : list) {
            if (!(element instanceof String s)) {
                throw new MalformedDocumentException(errorCode);
            }
            strings.add(s);
        }
        return strings;
    }

    private static String requiredString(Map<String, Object> map, String key, String errorCode) {
        if (!(map.get(key) instanceof String s) || s.isBlank()) {
            throw new MalformedDocumentException(errorCode);
        }
        return s;
    }

    /** 입력 문서 형식이 맞지 않다. 내용은 담지 않고 오류 코드만 가진다. */
    private static final class MalformedDocumentException extends RuntimeException {
        private final String errorCode;

        MalformedDocumentException(String errorCode) {
            super(errorCode, null, false, false);
            this.errorCode = errorCode;
        }
    }

    /** 트랜잭션을 실행한다. 충돌하면 Firestore가 함수를 다시 실행하므로 함수 안에서는 외부 호출을 하지 않는다. */
    private <T> T inTransaction(Transaction.Function<T> function) {
        try {
            return firestore.runTransaction(function).get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Firestore 채점 처리가 중단됐습니다.");
        } catch (ExecutionException e) {
            for (Throwable cause = e.getCause(); cause != null; cause = cause.getCause()) {
                if (cause instanceof IllegalStateException illegalState) {
                    throw illegalState;
                }
            }
            throw new IllegalStateException("Firestore 채점 처리에 실패했습니다: " + (e.getCause() == null ? "unknown" : e.getCause().getClass().getSimpleName()));
        }
    }
}
