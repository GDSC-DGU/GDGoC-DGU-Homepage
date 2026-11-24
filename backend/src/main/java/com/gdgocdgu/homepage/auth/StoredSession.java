package com.gdgocdgu.homepage.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;

/** Firestore authSessions 문서 하나 (docs/firestore-data-model.md 3-4) */
record StoredSession(String id, String userId, long authVersion, String refreshTokenHash, Instant expiresAt,
                     boolean revoked) {

    /** 쿠키로 받은 refresh token 의 해시가 저장된 값과 같은지. 비교 시간이 내용에 따라 달라지지 않게 isEqual 을 쓴다 */
    boolean hasRefreshTokenHash(String hash) {
        return MessageDigest.isEqual(refreshTokenHash.getBytes(StandardCharsets.UTF_8), hash.getBytes(StandardCharsets.UTF_8));
    }
}
