package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.firestore.FirestoreFutures;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

/**
 * recruitments 컬렉션 읽기 · 쓰기. 필드 이름은 backend/docs/rct-data-model.md 3-1과 같다.
 * 문서 ↔ {@link Recruitment} 변환은 이 클래스 안에서만 한다.
 */
@Repository
class FirestoreRecruitmentRepository implements RecruitmentRepository {

    static final String COLLECTION = "recruitments";

    private final Firestore firestore;

    FirestoreRecruitmentRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    @Override
    public List<Recruitment> findAll() {
        return FirestoreFutures.await(firestore.collection(COLLECTION).get())
                .getDocuments().stream()
                .map(FirestoreRecruitmentRepository::toRecruitment)
                .toList();
    }

    @Override
    public Optional<Recruitment> findById(String rid) {
        DocumentSnapshot doc = FirestoreFutures.await(firestore.collection(COLLECTION).document(rid).get());
        return doc.exists() ? Optional.of(toRecruitment(doc)) : Optional.empty();
    }

    static Recruitment toRecruitment(DocumentSnapshot doc) {
        return new Recruitment(
                doc.getId(),
                requireLong(doc, "cohort").intValue(),
                doc.getString("title"),
                RecruitmentStatus.valueOf(require(doc, "status", doc.getString("status"))),
                Boolean.TRUE.equals(doc.getBoolean("closedManually")),
                toInstant(require(doc, "applyStartAt", doc.getTimestamp("applyStartAt"))),
                toInstant(require(doc, "applyEndAt", doc.getTimestamp("applyEndAt"))),
                stringList(doc.get("tracks")),
                doc.getString("noticeMarkdown"),
                toInteger(doc.getLong("publishedFormVersion")),
                doc.getString("posterFileId"));
    }

    private static Long requireLong(DocumentSnapshot doc, String field) {
        return require(doc, field, doc.getLong(field));
    }

    private static <T> T require(DocumentSnapshot doc, String field, T value) {
        if (value == null) {
            // 저장 구조가 깨진 문서. 문서 ID와 필드 이름만 남긴다(개인정보 없음).
            throw new IllegalStateException("recruitments/" + doc.getId() + " 에 필수 필드 " + field + " 가 없습니다.");
        }
        return value;
    }

    private static Instant toInstant(Timestamp timestamp) {
        return Instant.ofEpochSecond(timestamp.getSeconds(), timestamp.getNanos());
    }

    private static Integer toInteger(Long value) {
        return value == null ? null : value.intValue();
    }

    private static List<String> stringList(Object value) {
        if (value instanceof List<?> list) {
            return list.stream().map(String::valueOf).toList();
        }
        return List.of();
    }
}
