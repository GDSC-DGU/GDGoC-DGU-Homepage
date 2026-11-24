package com.gdgocdgu.homepage.auth;

import com.gdgocdgu.homepage.common.error.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Component;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

@Component
class LoginSessionIssuer {

    static final Duration ACCESS_TOKEN_LIFETIME = Duration.ofMinutes(15);
    static final Duration SESSION_LIFETIME = Duration.ofHours(1);

    private static final String ISSUER = "gdgoc-dgu-homepage";
    private static final Base64.Encoder TOKEN_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final JwsHeader ACCESS_TOKEN_HEADER = JwsHeader.with(MacAlgorithm.HS256).build();

    private final SecureRandom random = new SecureRandom();
    private final JwtEncoder accessTokenEncoder;

    LoginSessionIssuer(@Value("${AUTH_ACCESS_TOKEN_SECRET:}") String signingSecret) {
        // 설정이 비어 있어도 서버 시작과 잘못된 토큰 거절은 가능하다.
        this.accessTokenEncoder = signingSecret.isBlank() ? null : createEncoder(signingSecret);
    }

    LoginSession issue(LoginMember member) {
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        String sessionId = UUID.randomUUID().toString();
        String accessToken = encodeAccessToken(member, sessionId, now, now.plus(ACCESS_TOKEN_LIFETIME));

        byte[] secret = new byte[32];
        random.nextBytes(secret);
        // refresh token = "세션 ID.무작위 값". 앞부분으로 세션 문서를 찾고, DB에는 전체의 해시만 둔다.
        String refreshToken = sessionId + "." + TOKEN_ENCODER.encodeToString(secret);
        return new LoginSession(sessionId, member, now, now.plus(SESSION_LIFETIME),
                accessToken, refreshToken, hash(refreshToken));
    }

    /**
     * 갱신(API-AUTH-002)용 access token. 세션은 그대로 두고 access token만 새로 만든다.
     * 수명은 15분과 세션 최종 만료까지 남은 시간 중 짧은 쪽이라, 갱신해도 로그인 1시간은 늘어나지 않는다.
     * 요청을 확인하는 사이(회원 조회 등)에 최종 만료가 지났을 수 있으므로, 토큰을 만들기 직전에 다시 확인한다.
     * 지났으면 남은 시간이 0초 이하인 토큰을 주지 않고 SESSION_EXPIRED 로 다시 로그인하게 한다.
     */
    AccessGrant reissue(LoginMember member, String sessionId, Instant sessionExpiresAt) {
        Instant current = Instant.now();
        if (!sessionExpiresAt.isAfter(current)) {
            throw new ApiException(AuthErrorCode.SESSION_EXPIRED);
        }
        Instant now = current.truncatedTo(ChronoUnit.SECONDS);
        Instant accessExpiresAt = now.plus(ACCESS_TOKEN_LIFETIME);
        if (sessionExpiresAt.isBefore(accessExpiresAt)) {
            accessExpiresAt = sessionExpiresAt;
        }
        String accessToken = encodeAccessToken(member, sessionId, now, accessExpiresAt);
        return new AccessGrant(accessToken, Duration.between(now, accessExpiresAt).toSeconds(), sessionExpiresAt, member);
    }

    /** refresh token 앞부분의 세션 ID. 모양이 맞지 않으면 비어 있다 (위조 · 손상된 쿠키) */
    static Optional<String> sessionIdOf(String refreshToken) {
        int dot = refreshToken.indexOf('.');
        if (dot <= 0 || dot == refreshToken.length() - 1) {
            return Optional.empty();
        }
        String sessionId = refreshToken.substring(0, dot);
        try {
            // 발급할 때 UUID 문자열을 썼으므로, 같은 모양인지만 확인한다.
            return UUID.fromString(sessionId).toString().equals(sessionId) ? Optional.of(sessionId) : Optional.empty();
        } catch (IllegalArgumentException notUuid) {
            return Optional.empty();
        }
    }

    /** refresh token 의 SHA-256 해시 (Base64url). 세션 문서의 refreshTokenHash 와 비교한다 */
    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return TOKEN_ENCODER.encodeToString(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", e);
        }
    }

    private String encodeAccessToken(LoginMember member, String sessionId, Instant issuedAt, Instant expiresAt) {
        if (accessTokenEncoder == null) {
            throw new IllegalStateException("AUTH_ACCESS_TOKEN_SECRET이 설정되지 않았습니다.");
        }
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .subject(member.userId())
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .claim("sid", sessionId)
                .claim("role", member.role())
                .build();
        return accessTokenEncoder.encode(JwtEncoderParameters.from(ACCESS_TOKEN_HEADER, claims)).getTokenValue();
    }

    private static JwtEncoder createEncoder(String signingSecret) {
        byte[] key;
        try {
            key = Base64.getDecoder().decode(signingSecret);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("AUTH_ACCESS_TOKEN_SECRET은 Base64 문자열이어야 합니다.");
        }
        if (key.length < 32) {
            throw new IllegalArgumentException("AUTH_ACCESS_TOKEN_SECRET은 디코딩 후 최소 32바이트여야 합니다.");
        }
        return NimbusJwtEncoder.withSecretKey(new SecretKeySpec(key, "HmacSHA256")).build();
    }
}
