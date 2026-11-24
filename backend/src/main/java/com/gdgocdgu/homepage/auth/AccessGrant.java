package com.gdgocdgu.homepage.auth;

import java.time.Instant;

/** 갱신(API-AUTH-002)으로 새로 준 access token. refresh token 은 바뀌지 않아 쿠키를 다시 보내지 않는다 */
record AccessGrant(String accessToken, long expiresInSeconds, Instant sessionExpiresAt, LoginMember member) {
}
