package com.gdgocdgu.homepage.auth;

import com.gdgocdgu.homepage.common.firestore.FirestoreFutures;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.Firestore;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * 다른 패키지의 보호 API 테스트용 로그인 세션. 에뮬레이터에 회원 · 세션 문서를 실제로 만들고 access token을 돌려준다.
 * 테스트 클래스의 {@code @SpringBootTest(properties = ...)}에 아래 세 설정을 넣는다.
 * {@code AUTH_USERS_COLLECTION=users}, {@code AUTH_USER_ACTIVE_FIELD=isActive},
 * {@code "AUTH_ACCESS_TOKEN_SECRET=" + AuthTestSessions.SIGNING_KEY}
 */
public final class AuthTestSessions {

    /** 테스트용 access token 서명 키(가짜 값). */
    public static final String SIGNING_KEY = AuthMemberLookupTest.TEST_SIGNING_KEY;

    private AuthTestSessions() {
    }

    public static String adminBearer(Firestore firestore) {
        return bearer(firestore, "test-admin", "ADMIN");
    }

    public static String generalBearer(Firestore firestore) {
        return bearer(firestore, "test-general", "GENERAL");
    }

    private static String bearer(Firestore firestore, String userId, String role) {
        Map<String, Object> member = new HashMap<>();
        member.put("name", "테스트 " + role);
        member.put("role", role);
        member.put("isActive", true);
        member.put("authVersion", 0L);
        FirestoreFutures.await(firestore.collection("users").document(userId).set(member));

        LoginSession session = new LoginSessionIssuer(AuthMemberLookupTest.TEST_SIGNING_KEY)
                .issue(new LoginMember(userId, "테스트 " + role, role, true, 0));
        Map<String, Object> fields = new HashMap<>();
        fields.put("userId", userId);
        fields.put("authVersion", 0L);
        fields.put("refreshTokenHash", session.refreshTokenHash());
        fields.put("createdAt", timestamp(session.createdAt()));
        fields.put("expiresAt", timestamp(session.expiresAt()));
        fields.put("revokedAt", null);
        FirestoreFutures.await(firestore.collection(LoginSessionRepository.COLLECTION).document(session.id()).set(fields));
        return "Bearer " + session.accessToken();
    }

    private static Timestamp timestamp(Instant instant) {
        return Timestamp.ofTimeSecondsAndNanos(instant.getEpochSecond(), instant.getNano());
    }
}
