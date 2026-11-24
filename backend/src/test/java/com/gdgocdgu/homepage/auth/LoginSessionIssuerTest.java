package com.gdgocdgu.homepage.auth;

import com.gdgocdgu.homepage.common.error.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import javax.crypto.spec.SecretKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 갱신용 access token 만들기 (reissue). 스프링 없이 바로 확인한다 */
class LoginSessionIssuerTest {

    private static final String KEY = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";
    private static final LoginMember MEMBER = new LoginMember("usr_test_001", "테스트 회원", "GENERAL", true, 0);

    private final LoginSessionIssuer issuer = new LoginSessionIssuer(KEY);

    @Test
    void 확인하는_사이_최종_만료가_지났으면_토큰을_만들지_않고_SESSION_EXPIRED() {
        // 서비스가 확인할 때는 살아 있었지만, 토큰을 만들려는 순간에는 이미 지난 세션
        Instant justExpired = Instant.now().minusMillis(1);

        assertThatThrownBy(() -> issuer.reissue(MEMBER, "sid-1", justExpired))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(AuthErrorCode.SESSION_EXPIRED));
    }

    @Test
    void 남은_시간이_15분보다_짧으면_그만큼만_주고_0초_이하는_없다() {
        Instant sessionExpiresAt = Instant.now().plus(Duration.ofMinutes(5)).truncatedTo(ChronoUnit.SECONDS);

        AccessGrant grant = issuer.reissue(MEMBER, "sid-1", sessionExpiresAt);

        assertThat(grant.expiresInSeconds()).isBetween(1L, 300L);
        Jwt claims = NimbusJwtDecoder.withSecretKey(new SecretKeySpec(Base64.getDecoder().decode(KEY), "HmacSHA256"))
                .build().decode(grant.accessToken());
        assertThat(claims.getExpiresAt()).isEqualTo(sessionExpiresAt);
        assertThat(claims.getExpiresAt()).isAfter(claims.getIssuedAt());
    }
}
