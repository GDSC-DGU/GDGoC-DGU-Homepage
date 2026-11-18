package com.gdgocdgu.homepage.auth;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

@Repository
class LoginMemberRepository {

    private final Firestore firestore;
    private final String usersCollection;
    private final String googleSubjectField;
    private final String activeField;

    LoginMemberRepository(
            @Lazy Firestore firestore,
            @Value("${AUTH_USERS_COLLECTION:}") String usersCollection,
            @Value("${AUTH_GOOGLE_SUB_FIELD:}") String googleSubjectField,
            @Value("${AUTH_USER_ACTIVE_FIELD:}") String activeField) {
        this.firestore = firestore;
        this.usersCollection = usersCollection;
        this.googleSubjectField = googleSubjectField;
        this.activeField = activeField;
    }

    Optional<Boolean> findActiveStatusByGoogleSubject(String googleSubject) {
        if (usersCollection.isBlank() || googleSubjectField.isBlank() || activeField.isBlank()) {
            throw new IllegalStateException("Firestore 회원 조회 설정이 비어 있습니다.");
        }

        List<QueryDocumentSnapshot> members;
        try {
            // 한 Google 계정에 회원이 중복 연결됐는지 확인하기 위해 최대 두 건을 읽는다.
            members = firestore.collection(usersCollection)
                    .whereEqualTo(googleSubjectField, googleSubject)
                    .limit(2)
                    .get()
                    .get()
                    .getDocuments();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Firestore 회원 조회가 중단됐습니다.");
        } catch (ExecutionException e) {
            throw new IllegalStateException("Firestore 회원 조회에 실패했습니다.");
        }

        if (members.isEmpty()) {
            return Optional.empty();
        }
        if (members.size() > 1) {
            throw new IllegalStateException("Google 계정에 여러 회원이 연결돼 있습니다.");
        }

        Object active = members.getFirst().get(activeField);
        if (!(active instanceof Boolean isActive)) {
            throw new IllegalStateException("Firestore 회원의 활성 상태를 읽을 수 없습니다.");
        }
        return Optional.of(isActive);
    }
}
