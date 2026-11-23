package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.firestore.FirestoreFutures;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Repository;

/** recruitments/{rid}/formVersions 읽기. 필드 이름은 backend/docs/rct-data-model.md 3-2와 같다. */
@Repository
class FirestoreFormVersionRepository implements FormVersionRepository {

    static final String COLLECTION = "formVersions";

    private final Firestore firestore;

    FirestoreFormVersionRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    @Override
    public Optional<ApplicationForm> find(String rid, int version) {
        DocumentSnapshot doc = FirestoreFutures.await(firestore.collection(FirestoreRecruitmentRepository.COLLECTION)
                .document(rid).collection(COLLECTION).document(String.valueOf(version)).get());
        return doc.exists() ? Optional.of(toForm(doc, version)) : Optional.empty();
    }

    private static ApplicationForm toForm(DocumentSnapshot doc, int version) {
        if (!(doc.get("questions") instanceof List<?> questions)) {
            throw brokenDocument(doc, "questions");
        }
        return new ApplicationForm(version, questions.stream().map(question -> toQuestion(doc, question)).toList());
    }

    private static FormQuestion toQuestion(DocumentSnapshot doc, Object value) {
        if (!(value instanceof Map<?, ?> question)) {
            throw brokenDocument(doc, "questions");
        }
        if (!(question.get("questionId") instanceof String questionId)) {
            throw brokenDocument(doc, "questionId");
        }
        if (!(question.get("type") instanceof String type)) {
            throw brokenDocument(doc, "type");
        }
        if (!(question.get("title") instanceof String title)) {
            throw brokenDocument(doc, "title");
        }
        if (!(question.get("required") instanceof Boolean required)) {
            throw brokenDocument(doc, "required");
        }
        return new FormQuestion(
                questionId,
                QuestionType.valueOf(type),
                title,
                question.get("description") instanceof String description ? description : null,
                required,
                question.get("maxLength") instanceof Number maxLength ? maxLength.intValue() : null,
                stringList(question.get("options")),
                stringList(question.get("trackOnly")));
    }

    private static IllegalStateException brokenDocument(DocumentSnapshot doc, String field) {
        // 저장 구조가 깨진 문서. 경로와 필드 이름만 남긴다.
        return new IllegalStateException(doc.getReference().getPath() + " 의 필드 " + field + " 가 올바르지 않습니다.");
    }

    private static List<String> stringList(Object value) {
        if (value instanceof List<?> list) {
            return list.stream().map(String::valueOf).toList();
        }
        return List.of();
    }
}
