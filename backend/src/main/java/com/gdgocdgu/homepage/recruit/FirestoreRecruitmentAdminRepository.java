package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.common.error.CommonErrorCode;
import com.google.api.core.ApiFuture;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.Transaction;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import org.springframework.stereotype.Repository;

/** recruitments 쓰기 (rct-data-model.md 3-1). 회차 문서 ID는 rct_{cohort}다. */
@Repository
class FirestoreRecruitmentAdminRepository implements RecruitmentAdminRepository {

    /** 기수를 바꿀 때 새 ID로 함께 옮기는 하위 컬렉션. applicationKeys는 지원서가 없으면 비어 있다. */
    private static final List<String> MOVED_SUBCOLLECTIONS = List.of(
            FirestoreFormVersionRepository.COLLECTION, "criteriaVersions", FirestoreApplicationKeyRepository.COLLECTION);

    private final Firestore firestore;

    FirestoreRecruitmentAdminRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    @Override
    public boolean create(NewRecruitment recruitment) {
        Timestamp now = timestamp(recruitment.createdAt());
        Map<String, Object> stage = new HashMap<>();
        stage.put("confirmed", false);
        stage.put("confirmedAt", null);
        stage.put("confirmedBy", null);
        stage.put("unlockedReason", null);

        Map<String, Object> doc = new HashMap<>();
        doc.put("cohort", recruitment.cohort());
        doc.put("title", recruitment.title());
        doc.put("status", RecruitmentStatus.DRAFT.name());
        doc.put("closedManually", false);
        doc.put("applyStartAt", timestamp(recruitment.applyStartAt()));
        doc.put("applyEndAt", timestamp(recruitment.applyEndAt()));
        doc.put("tracks", recruitment.tracks());
        doc.put("noticeMarkdown", recruitment.noticeMarkdown());
        doc.put("posterFileId", null);
        doc.put("latestFormVersion", null);
        doc.put("publishedFormVersion", null);
        doc.put("currentCriteriaVersion", null);
        doc.put("stages", Map.of("DOCUMENT", stage, "INTERVIEW", stage));
        doc.put("membersRegistered", false);
        doc.put("createdAt", now);
        doc.put("updatedAt", now);
        doc.put("createdBy", recruitment.createdBy());
        doc.put("updatedBy", recruitment.createdBy());
        DocumentReference ref = recruitments().document(recruitment.rid());
        return await(firestore.runTransaction(tx -> {
            if (tx.get(ref).get().exists()) {
                return false;
            }
            tx.create(ref, doc);
            return true;
        }));
    }

    @Override
    public Recruitment update(String rid, RecruitmentUpdater updater, String actorId, Instant now) {
        return await(firestore.runTransaction(tx -> {
            DocumentReference ref = recruitments().document(rid);
            DocumentSnapshot doc = tx.get(ref).get();
            if (!doc.exists()) {
                throw new ApiException(CommonErrorCode.NOT_FOUND, "모집 회차가 없습니다.");
            }
            Recruitment current = FirestoreRecruitmentRepository.toRecruitment(doc);
            Recruitment updated = updater.apply(current, Boolean.TRUE.equals(doc.getBoolean("membersRegistered")));

            Map<String, Object> fields = new HashMap<>();
            fields.put("cohort", updated.cohort());
            fields.put("title", updated.title());
            fields.put("status", updated.status().name());
            fields.put("closedManually", updated.closedManually());
            fields.put("applyStartAt", timestamp(updated.applyStartAt()));
            fields.put("applyEndAt", timestamp(updated.applyEndAt()));
            fields.put("tracks", updated.tracks());
            fields.put("noticeMarkdown", updated.noticeMarkdown());
            fields.put("updatedAt", timestamp(now));
            fields.put("updatedBy", actorId);

            if (updated.rid().equals(rid)) {
                tx.update(ref, fields);
                return updated;
            }
            moveRecruitment(tx, ref, doc, recruitments().document(updated.rid()), fields);
            return updated;
        }));
    }

    /** 기수 변경. 모든 읽기를 쓰기보다 먼저 한다(Firestore 트랜잭션 규칙). */
    private void moveRecruitment(Transaction tx, DocumentReference from, DocumentSnapshot fromDoc,
            DocumentReference to, Map<String, Object> fields) throws ExecutionException, InterruptedException {
        boolean hasApplications = !tx.get(firestore.collection(FirestoreApplicationSubmitRepository.APPLICATIONS)
                .whereEqualTo("rid", from.getId()).limit(1)).get().isEmpty();
        if (hasApplications) {
            throw new ApiException(RecruitErrorCode.COHORT_LOCKED, "지원서가 있는 회차는 기수를 바꿀 수 없습니다.");
        }
        if (tx.get(to).get().exists()) {
            throw new ApiException(RecruitErrorCode.COHORT_EXISTS,
                    fields.get("cohort") + "기 모집 회차가 이미 있습니다.");
        }
        List<QueryDocumentSnapshot> children = new ArrayList<>();
        for (String collection : MOVED_SUBCOLLECTIONS) {
            children.addAll(tx.get(from.collection(collection)).get().getDocuments());
        }

        Map<String, Object> moved = new HashMap<>(fromDoc.getData());
        moved.putAll(fields);
        tx.create(to, moved);
        for (QueryDocumentSnapshot child : children) {
            String collection = child.getReference().getParent().getId();
            tx.create(to.collection(collection).document(child.getId()), child.getData());
            tx.delete(child.getReference());
        }
        tx.delete(from);
    }

    private com.google.cloud.firestore.CollectionReference recruitments() {
        return firestore.collection(FirestoreRecruitmentRepository.COLLECTION);
    }

    /** 트랜잭션 안에서 던진 업무 오류(ApiException)는 그대로 다시 던진다. */
    private static <T> T await(ApiFuture<T> future) {
        try {
            return future.get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Firestore 요청 대기 중 중단되었습니다.", e);
        } catch (ExecutionException e) {
            for (Throwable cause = e.getCause(); cause != null; cause = cause.getCause()) {
                if (cause instanceof ApiException apiException) {
                    throw apiException;
                }
            }
            throw new IllegalStateException("Firestore 요청이 실패했습니다.", e.getCause());
        }
    }

    private static Timestamp timestamp(Instant instant) {
        return Timestamp.ofTimeSecondsAndNanos(instant.getEpochSecond(), instant.getNano());
    }
}
