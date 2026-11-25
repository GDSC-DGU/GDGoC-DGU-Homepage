package com.gdgocdgu.homepage.auth;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

/** 로그인 세션(authSessions) 읽기 · 무효화. 세션 만들기는 회원 조회와 한 트랜잭션이라 LoginMemberRepository 에 있다 */
@Repository
class LoginSessionRepository {

    static final String COLLECTION = "authSessions";

    private final Firestore firestore;

    LoginSessionRepository(@Lazy Firestore firestore) {
        this.firestore = firestore;
    }

    Optional<StoredSession> find(String sessionId) {
        DocumentSnapshot document;
        try {
            document = firestore.collection(COLLECTION).document(sessionId).get().get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Firestore 세션 조회가 중단됐습니다.");
        } catch (ExecutionException e) {
            throw new IllegalStateException("Firestore 세션 조회에 실패했습니다.", e);
        }
        if (!document.exists()) {
            return Optional.empty();
        }

        String userId = document.getString("userId");
        Long authVersion = document.getLong("authVersion");
        String refreshTokenHash = document.getString("refreshTokenHash");
        Timestamp expiresAt = document.getTimestamp("expiresAt");
        if (userId == null || authVersion == null || refreshTokenHash == null || expiresAt == null) {
            // 발급할 때 모두 채우는 값이라, 비어 있으면 데이터가 잘못된 것(서버 오류)이다.
            throw new IllegalStateException("Firestore 세션 문서를 읽을 수 없습니다.");
        }
        return Optional.of(new StoredSession(document.getId(), userId, authVersion, refreshTokenHash,
                toInstant(expiresAt), document.get("revokedAt") != null));
    }

    /**
     * 로그아웃(API-AUTH-003). 아직 무효화되지 않은 세션이면 revokedAt 과 정리 기준 deleteAfter 를 지금으로 적는다.
     * 다른 요청이 먼저 무효화했으면 그 시각을 덮어쓰지 않도록 트랜잭션 안에서 다시 읽고 쓴다.
     */
    void revoke(String sessionId, Instant now) {
        DocumentReference session = firestore.collection(COLLECTION).document(sessionId);
        Timestamp at = Timestamp.ofTimeSecondsAndNanos(now.getEpochSecond(), now.getNano());
        try {
            firestore.runTransaction(transaction -> {
                DocumentSnapshot current = transaction.get(session).get();
                if (current.exists() && current.get("revokedAt") == null) {
                    transaction.update(session, Map.of("revokedAt", at, "deleteAfter", at));
                }
                return null;
            }).get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Firestore 세션 무효화가 중단됐습니다.");
        } catch (ExecutionException e) {
            throw new IllegalStateException("Firestore 세션 무효화에 실패했습니다.", e);
        }
    }

    private static Instant toInstant(Timestamp timestamp) {
        return Instant.ofEpochSecond(timestamp.getSeconds(), timestamp.getNanos());
    }
}
