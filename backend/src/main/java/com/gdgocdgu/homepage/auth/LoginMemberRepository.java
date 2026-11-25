package com.gdgocdgu.homepage.auth;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;
import java.util.function.Function;

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

    Optional<LoginSession> createSessionForGoogleSubject(
            String googleSubject, Function<LoginMember, LoginSession> issueSession) {
        requireSettings();

        // 한 Google 계정에 회원이 중복 연결됐는지 확인하기 위해 최대 두 건을 읽는다.
        Query matchingMembers = firestore.collection(usersCollection)
                .whereEqualTo(googleSubjectField, googleSubject)
                .limit(2);
        try {
            // 회원 상태가 바뀌면 Firestore가 조회부터 다시 시도한다.
            return firestore.runTransaction(transaction -> {
                List<QueryDocumentSnapshot> members = transaction.get(matchingMembers).get().getDocuments();
                if (members.isEmpty()) {
                    return Optional.<LoginSession>empty();
                }
                if (members.size() > 1) {
                    throw new IllegalStateException("Google 계정에 여러 회원이 연결돼 있습니다.");
                }

                LoginSession session = issueSession.apply(readMember(members.getFirst()));
                transaction.create(firestore.collection(LoginSessionRepository.COLLECTION).document(session.id()),
                        sessionFields(session));
                return Optional.of(session);
            }).get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Firestore 로그인 처리가 중단됐습니다.");
        } catch (ExecutionException e) {
            for (Throwable cause = e.getCause(); cause != null; cause = cause.getCause()) {
                if (cause instanceof ApiException apiException) {
                    throw apiException;
                }
            }
            throw new IllegalStateException("Firestore 로그인 처리에 실패했습니다.");
        }
    }

    Optional<SessionMember> findSessionMember(String sessionId, String userId) {
        if (usersCollection.isBlank() || activeField.isBlank()) {
            throw new IllegalStateException("Firestore 회원 조회 설정이 비어 있습니다.");
        }

        DocumentReference sessionRef = firestore.collection(LoginSessionRepository.COLLECTION).document(sessionId);
        DocumentReference memberRef = firestore.collection(usersCollection).document(userId);
        List<DocumentSnapshot> documents;
        try {
            documents = firestore.getAll(sessionRef, memberRef).get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Firestore 인증 조회가 중단됐습니다.", e);
        } catch (ExecutionException e) {
            throw new IllegalStateException("Firestore 인증 조회에 실패했습니다.", e);
        }

        DocumentSnapshot session = documents.getFirst();
        DocumentSnapshot member = documents.getLast();
        if (!session.exists() || !member.exists()) {
            return Optional.empty();
        }

        String sessionUserId = session.getString("userId");
        Timestamp expiresAt = session.getTimestamp("expiresAt");
        if (sessionUserId == null || expiresAt == null
                || !(session.get("authVersion") instanceof Long sessionVersion) || sessionVersion < 0) {
            throw new IllegalStateException("Firestore 세션 정보를 읽을 수 없습니다.");
        }

        return Optional.of(new SessionMember(readMember(member), sessionUserId, sessionVersion,
                Instant.ofEpochSecond(expiresAt.getSeconds(), expiresAt.getNanos()), session.get("revokedAt") != null));
    }

    /** 갱신(API-AUTH-002)에서 세션의 회원이 아직 로그인할 수 있는지 다시 확인할 때 쓴다. 문서가 없으면 비어 있다 */
    Optional<LoginMember> findById(String userId) {
        requireSettings();
        DocumentSnapshot document;
        try {
            document = firestore.collection(usersCollection).document(userId).get().get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Firestore 회원 조회가 중단됐습니다.");
        } catch (ExecutionException e) {
            throw new IllegalStateException("Firestore 회원 조회에 실패했습니다.", e);
        }
        return document.exists() ? Optional.of(readMember(document)) : Optional.empty();
    }

    private void requireSettings() {
        if (usersCollection.isBlank() || googleSubjectField.isBlank() || activeField.isBlank()) {
            throw new IllegalStateException("Firestore 회원 조회 설정이 비어 있습니다.");
        }
    }

    private LoginMember readMember(DocumentSnapshot document) {
        Object active = document.get(activeField);
        if (!(active instanceof Boolean isActive)) {
            throw new IllegalStateException("Firestore 회원의 활성 상태를 읽을 수 없습니다.");
        }
        if (!isActive) {
            return new LoginMember(document.getId(), null, null, false, 0);
        }

        Object version = document.get("authVersion");
        if (version != null && (!(version instanceof Long authVersion) || authVersion < 0)) {
            throw new IllegalStateException("Firestore 회원의 인증 버전을 읽을 수 없습니다.");
        }
        // 기존 회원 문서에 authVersion이 없으면 초기값 0을 사용한다.
        return new LoginMember(document.getId(), document.getString("name"), document.getString("role"), true,
                version == null ? 0 : (Long) version);
    }

    private static Map<String, Object> sessionFields(LoginSession session) {
        Timestamp expiresAt = asTimestamp(session.expiresAt());
        Map<String, Object> fields = new HashMap<>();
        fields.put("userId", session.member().userId());
        fields.put("authVersion", session.member().authVersion());
        fields.put("refreshTokenHash", session.refreshTokenHash());
        fields.put("createdAt", asTimestamp(session.createdAt()));
        fields.put("expiresAt", expiresAt);
        fields.put("deleteAfter", expiresAt);
        fields.put("revokedAt", null);
        return fields;
    }

    private static Timestamp asTimestamp(Instant instant) {
        return Timestamp.ofTimeSecondsAndNanos(instant.getEpochSecond(), instant.getNano());
    }

    record SessionMember(LoginMember member, String sessionUserId, long sessionAuthVersion,
                         Instant sessionExpiresAt, boolean sessionRevoked) {
    }
}
