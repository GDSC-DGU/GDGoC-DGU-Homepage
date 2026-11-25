package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.firestore.FirestoreFutures;
import com.gdgocdgu.homepage.recruit.SubmitResult.Rejected;
import com.gdgocdgu.homepage.recruit.SubmitResult.Submitted;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Repository;

/**
 * 지원서 제출 트랜잭션 (backend/docs/rct-data-model.md 3-4 · 3-5 · 4장).
 * 채점 상태는 RCT-028 · 031이 읽는 초기값(PENDING · criteriaVersion · requestedAt · attempts 0)으로 만든다.
 */
@Repository
class FirestoreApplicationSubmitRepository implements ApplicationSubmitRepository {

    static final String APPLICATIONS = "applications";

    private final Firestore firestore;

    FirestoreApplicationSubmitRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    @Override
    public SubmitResult submit(NewApplication application) {
        return FirestoreFutures.await(firestore.runTransaction(tx -> {
            DocumentReference recruitmentRef = firestore.collection(FirestoreRecruitmentRepository.COLLECTION)
                    .document(application.rid());
            CollectionReference keys = recruitmentRef.collection(FirestoreApplicationKeyRepository.COLLECTION);
            DocumentReference studentIdKey = keys.document(application.studentIdKey());
            DocumentReference emailKey = keys.document(application.emailKey());

            // Firestore 트랜잭션은 모든 읽기가 쓰기보다 먼저여야 한다.
            DocumentSnapshot recruitmentDoc = tx.get(recruitmentRef).get();
            List<DocumentSnapshot> keyDocs = tx.getAll(studentIdKey, emailKey).get();

            if (!recruitmentDoc.exists()) {
                return new Rejected(RecruitErrorCode.RECRUITMENT_CLOSED);
            }
            Recruitment recruitment = FirestoreRecruitmentRepository.toRecruitment(recruitmentDoc);
            if (!recruitment.applyState(application.submittedAt()).canApply()) {
                return new Rejected(RecruitErrorCode.RECRUITMENT_CLOSED);
            }
            if (!Integer.valueOf(application.submission().formVersion()).equals(recruitment.publishedFormVersion())) {
                return new Rejected(RecruitErrorCode.FORM_CHANGED);
            }
            if (keyDocs.stream().anyMatch(DocumentSnapshot::exists)) {
                return new Rejected(RecruitErrorCode.APPLICATION_DUPLICATED);
            }
            Long criteriaVersion = recruitmentDoc.getLong("currentCriteriaVersion");
            if (criteriaVersion == null || criteriaVersion < 1) {
                // 폼 게시(RCT-011)가 기준 버전을 요구하므로 정상 데이터에서는 생기지 않는다.
                throw new IllegalStateException("recruitments/" + application.rid() + " 에 평가 기준 버전이 없습니다.");
            }

            Timestamp now = toTimestamp(application);
            DocumentReference applicationRef = firestore.collection(APPLICATIONS).document(application.aid());
            tx.create(applicationRef, applicationDocument(application, recruitment.cohort(), criteriaVersion, now));
            Map<String, Object> key = Map.of("aid", application.aid(), "createdAt", now);
            tx.create(studentIdKey, key);
            tx.create(emailKey, key);
            return new Submitted(criteriaVersion.intValue());
        }));
    }

    private static Map<String, Object> applicationDocument(NewApplication application, int cohort,
            long criteriaVersion, Timestamp now) {
        ApplicationSubmission submission = application.submission();
        Map<String, Object> applicant = new LinkedHashMap<>();
        applicant.put("name", submission.name());
        applicant.put("studentId", submission.studentId());
        applicant.put("major", submission.major());
        applicant.put("email", submission.email());
        applicant.put("phone", submission.phone());

        List<Map<String, Object>> answers = new ArrayList<>();
        for (SubmittedAnswer answer : submission.answers()) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("questionId", answer.questionId());
            if (answer.values() != null) {
                map.put("values", answer.values());
            } else {
                map.put("value", answer.value());
            }
            answers.add(map);
        }

        Map<String, Object> scoring = new HashMap<>();
        scoring.put("status", "PENDING");
        scoring.put("criteriaVersion", criteriaVersion);
        scoring.put("runId", null);
        scoring.put("totalScore", null);
        scoring.put("items", List.of());
        scoring.put("attempts", 0);
        scoring.put("error", null);
        scoring.put("requestedAt", now);

        Map<String, Object> stages = new HashMap<>();
        stages.put("DOCUMENT", stage());
        Map<String, Object> interview = stage();
        interview.put("interview", null);
        stages.put("INTERVIEW", interview);

        Map<String, Object> doc = new HashMap<>();
        doc.put("rid", application.rid());
        doc.put("cohort", cohort);
        doc.put("formVersion", submission.formVersion());
        doc.put("applicant", applicant);
        doc.put("track", submission.track());
        doc.put("answers", answers);
        doc.put("privacyConsent", Map.of("agreed", true, "agreedAt", now));
        doc.put("submittedAt", now);
        doc.put("deleted", false);
        doc.put("currentStage", "DOCUMENT");
        doc.put("scoring", scoring);
        doc.put("stages", stages);
        doc.put("member", null);
        doc.put("updatedAt", now);
        return doc;
    }

    private static Map<String, Object> stage() {
        Map<String, Object> stage = new HashMap<>();
        stage.put("result", "PENDING");
        stage.put("resultFixed", false);
        stage.put("mailStatus", "NOT_SENT");
        return stage;
    }

    private static Timestamp toTimestamp(NewApplication application) {
        return Timestamp.ofTimeSecondsAndNanos(
                application.submittedAt().getEpochSecond(), application.submittedAt().getNano());
    }
}
