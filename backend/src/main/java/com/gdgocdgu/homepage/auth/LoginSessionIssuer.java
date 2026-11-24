package com.gdgocdgu.homepage.auth;

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
import java.util.UUID;

@Component
class LoginSessionIssuer {

    static final Duration ACCESS_TOKEN_LIFETIME = Duration.ofMinutes(15);
    static final Duration SESSION_LIFETIME = Duration.ofHours(1);

    static final String ISSUER = "gdgoc-dgu-homepage";
    static final MacAlgorithm ACCESS_TOKEN_ALGORITHM = MacAlgorithm.HS256;
    private static final Base64.Encoder TOKEN_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final JwsHeader ACCESS_TOKEN_HEADER = JwsHeader.with(ACCESS_TOKEN_ALGORITHM).build();

    private final SecureRandom random = new SecureRandom();
    private final JwtEncoder accessTokenEncoder;

    LoginSessionIssuer(@Value("${AUTH_ACCESS_TOKEN_SECRET:}") String signingSecret) {
        // 설정이 비어 있어도 서버 시작과 잘못된 토큰 거절은 가능하다.
        this.accessTokenEncoder = signingSecret.isBlank() ? null : createEncoder(signingSecret);
    }

    LoginSession issue(LoginMember member) {
        if (accessTokenEncoder == null) {
            throw new IllegalStateException("AUTH_ACCESS_TOKEN_SECRET이 설정되지 않았습니다.");
        }

        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        String sessionId = UUID.randomUUID().toString();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .subject(member.userId())
                .issuedAt(now)
                .expiresAt(now.plus(ACCESS_TOKEN_LIFETIME))
                .claim("sid", sessionId)
                .claim("role", member.role())
                .build();
        String accessToken = accessTokenEncoder.encode(
                JwtEncoderParameters.from(ACCESS_TOKEN_HEADER, claims)).getTokenValue();

        byte[] secret = new byte[32];
        random.nextBytes(secret);
        String refreshToken = sessionId + "." + TOKEN_ENCODER.encodeToString(secret);
        return new LoginSession(sessionId, member, now, now.plus(SESSION_LIFETIME),
                accessToken, refreshToken, hash(refreshToken));
    }

    private static JwtEncoder createEncoder(String signingSecret) {
        return NimbusJwtEncoder.withSecretKey(readSigningKey(signingSecret)).build();
    }

    static SecretKeySpec readSigningKey(String signingSecret) {
        byte[] key;
        try {
            key = Base64.getDecoder().decode(signingSecret);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("AUTH_ACCESS_TOKEN_SECRET은 Base64 문자열이어야 합니다.");
        }
        if (key.length < 32) {
            throw new IllegalArgumentException("AUTH_ACCESS_TOKEN_SECRET은 디코딩 후 최소 32바이트여야 합니다.");
        }
        return new SecretKeySpec(key, "HmacSHA256");
    }

    private static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return TOKEN_ENCODER.encodeToString(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", e);
        }
    }
}
