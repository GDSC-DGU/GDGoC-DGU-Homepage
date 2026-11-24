package com.gdgocdgu.homepage.auth;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.common.error.CommonErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
class AccessTokenVerifier {

    private static final Pattern BEARER_JWT = Pattern.compile(
            "Bearer +([A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+)", Pattern.CASE_INSENSITIVE);

    private final JwtDecoder accessTokenDecoder;

    AccessTokenVerifier(@Value("${AUTH_ACCESS_TOKEN_SECRET:}") String signingSecret) {
        this.accessTokenDecoder = signingSecret.isBlank() ? null : createDecoder(signingSecret);
    }

    VerifiedAccessToken verify(String authorizationHeader) {
        if (authorizationHeader == null) {
            throw new ApiException(CommonErrorCode.AUTH_REQUIRED);
        }
        Matcher bearer = BEARER_JWT.matcher(authorizationHeader);
        if (!bearer.matches()) {
            throw new ApiException(CommonErrorCode.AUTH_REQUIRED);
        }
        if (accessTokenDecoder == null) {
            throw new IllegalStateException("AUTH_ACCESS_TOKEN_SECRET이 설정되지 않았습니다.");
        }

        Jwt token;
        try {
            token = accessTokenDecoder.decode(bearer.group(1));
        } catch (JwtException e) {
            throw new ApiException(CommonErrorCode.AUTH_REQUIRED);
        }

        // 세션 조회에 필요한 ID만 넘긴다. 역할은 회원 문서에서 확인한다.
        if (!(token.getClaims().get(JwtClaimNames.SUB) instanceof String userId) || userId.isBlank()
                || !(token.getClaims().get("sid") instanceof String sessionId) || !isSessionId(sessionId)) {
            throw new ApiException(CommonErrorCode.AUTH_REQUIRED);
        }
        return new VerifiedAccessToken(userId, sessionId);
    }

    private static JwtDecoder createDecoder(String signingSecret) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(LoginSessionIssuer.readSigningKey(signingSecret))
                .macAlgorithm(LoginSessionIssuer.ACCESS_TOKEN_ALGORITHM)
                .build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                new JwtIssuerValidator(LoginSessionIssuer.ISSUER),
                new JwtTimestampValidator(Duration.ZERO),
                // 만료 시각은 필수이며, 해당 시각부터 토큰을 거절한다.
                new JwtClaimValidator<Instant>(JwtClaimNames.EXP,
                        expiresAt -> expiresAt.isAfter(Instant.now()))));
        return decoder;
    }

    private static boolean isSessionId(String sessionId) {
        try {
            return UUID.fromString(sessionId).toString().equals(sessionId);
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    record VerifiedAccessToken(String userId, String sessionId) {
    }
}
