package com.gdgocdgu.homepage.auth;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.common.error.CommonErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AccessTokenVerifierTest {

    private static final String SIGNING_KEY = testKey('a');
    private static final String USER_ID = "test-user";
    private static final String SESSION_ID = "f74bbd9a-4fe7-4bbf-8e24-01af9bb38afb";

    private final AccessTokenVerifier verifier = new AccessTokenVerifier(SIGNING_KEY);

    @Test
    void 로그인에서_발급한_토큰의_회원과_세션_ID를_반환한다() {
        LoginSession session = new LoginSessionIssuer(SIGNING_KEY)
                .issue(new LoginMember(USER_ID, "테스트 회원", "GENERAL", true, 0));

        AccessTokenVerifier.VerifiedAccessToken token = verifier.verify("bearer " + session.accessToken());

        assertThat(token.userId()).isEqualTo(USER_ID);
        assertThat(token.sessionId()).isEqualTo(session.id());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"Bearer", "Basic abc", "Bearer not-a-jwt", "Bearer aaa.bbb.ccc"})
    void 인증_헤더가_없거나_형식이_잘못되면_거절한다(String authorizationHeader) {
        assertAuthRequired(authorizationHeader);
    }

    @Test
    void 다른_키로_서명한_토큰을_거절한다() {
        assertAuthRequired(signedHeader(testKey('b'), claims -> {}));
    }

    @Test
    void 발급자가_다른_토큰을_거절한다() {
        assertAuthRequired(signedHeader(SIGNING_KEY, claims -> claims.issuer("different-service")));
    }

    @Test
    void 만료된_토큰을_유예_시간_없이_거절한다() {
        Instant now = Instant.now();
        assertAuthRequired(signedHeader(SIGNING_KEY, claims ->
                claims.issuedAt(now.minusSeconds(900)).expiresAt(now.minusSeconds(1))));
    }

    @Test
    void 만료_시각이_없는_토큰을_거절한다() {
        assertAuthRequired(signedHeader(SIGNING_KEY, claims -> claims.claims(values -> values.remove("exp"))));
    }

    @Test
    void 아직_사용할_수_없는_토큰을_거절한다() {
        assertAuthRequired(signedHeader(SIGNING_KEY, claims -> claims.notBefore(Instant.now().plusSeconds(60))));
    }

    @Test
    void 사용자_ID가_없는_토큰을_거절한다() {
        assertAuthRequired(signedHeader(SIGNING_KEY, claims -> claims.claims(values -> values.remove("sub"))));
    }

    @Test
    void 세션_ID가_잘못된_토큰을_거절한다() {
        assertAuthRequired(signedHeader(SIGNING_KEY, claims -> claims.claim("sid", "not-a-session-id")));
    }

    private void assertAuthRequired(String header) {
        assertThatThrownBy(() -> verifier.verify(header))
                .isInstanceOfSatisfying(ApiException.class, error ->
                        assertThat(error.getErrorCode()).isEqualTo(CommonErrorCode.AUTH_REQUIRED));
    }

    private static String signedHeader(String signingKey, Consumer<JwtClaimsSet.Builder> updateClaims) {
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .issuer(LoginSessionIssuer.ISSUER)
                .subject(USER_ID)
                .expiresAt(Instant.now().plusSeconds(900))
                .claim("sid", SESSION_ID);
        updateClaims.accept(claims);
        NimbusJwtEncoder encoder = NimbusJwtEncoder.withSecretKey(LoginSessionIssuer.readSigningKey(signingKey)).build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return "Bearer " + encoder.encode(JwtEncoderParameters.from(header, claims.build())).getTokenValue();
    }

    private static String testKey(char character) {
        return Base64.getEncoder().encodeToString(String.valueOf(character).repeat(32).getBytes(StandardCharsets.US_ASCII));
    }
}
