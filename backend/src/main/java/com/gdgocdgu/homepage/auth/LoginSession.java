package com.gdgocdgu.homepage.auth;

import java.time.Instant;

record LoginSession(
        String id,
        LoginMember member,
        Instant createdAt,
        Instant expiresAt,
        String accessToken,
        String refreshToken,
        String refreshTokenHash
) {
}
