package com.gdgocdgu.homepage.auth;

import com.google.api.core.ApiFutures;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Transaction;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import javax.crypto.spec.SecretKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** API-AUTH-002 갱신 · API-AUTH-003 로그아웃. Firestore 는 가짜(mock)로 두고 분기마다 확인한다 */
@SpringBootTest(properties = {
        "AUTH_USERS_COLLECTION=testUsers",
        "AUTH_GOOGLE_SUB_FIELD=testGoogleSub",
        "AUTH_USER_ACTIVE_FIELD=testIsActive",
        "AUTH_ACCESS_TOKEN_SECRET=" + AuthRefreshLogoutTest.TEST_SIGNING_KEY,
        "app.auth.allowed-origins=https://frontend.example.test",
        "app.auth.refresh-cookie-secure=true"
})
@AutoConfigureMockMvc
class AuthRefreshLogoutTest {

    static final String TEST_SIGNING_KEY = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";
    private static final String ORIGIN = "https://frontend.example.test";
    private static final String SESSION_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
    private static final String REFRESH_TOKEN = SESSION_ID + ".c2VjcmV0LXZhbHVlLWZvci10ZXN0";
    private static final String USER_ID = "usr_test_001";

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    Firestore firestore;

    private DocumentReference sessionDocument;
    private DocumentSnapshot storedSession;
    private DocumentSnapshot storedMember;
    private Transaction transaction;

    @BeforeEach
    void setUp() {
        CollectionReference sessions = mock(CollectionReference.class);
        sessionDocument = mock(DocumentReference.class);
        storedSession = mock(DocumentSnapshot.class);
        when(firestore.collection("authSessions")).thenReturn(sessions);
        when(sessions.document(SESSION_ID)).thenReturn(sessionDocument);
        when(sessionDocument.get()).thenReturn(ApiFutures.immediateFuture(storedSession));

        CollectionReference users = mock(CollectionReference.class);
        DocumentReference memberDocument = mock(DocumentReference.class);
        storedMember = mock(DocumentSnapshot.class);
        when(firestore.collection("testUsers")).thenReturn(users);
        when(users.document(USER_ID)).thenReturn(memberDocument);
        when(memberDocument.get()).thenReturn(ApiFutures.immediateFuture(storedMember));

        transaction = mock(Transaction.class);
        when(firestore.runTransaction(any())).thenAnswer(invocation -> {
            Transaction.Function<?> work = invocation.getArgument(0);
            try {
                return ApiFutures.immediateFuture(work.updateCallback(transaction));
            } catch (Exception e) {
                return ApiFutures.immediateFailedFuture(e);
            }
        });
        when(transaction.get(sessionDocument)).thenReturn(ApiFutures.immediateFuture(storedSession));
    }

    // ── 갱신 ──

    @Test
    void 쿠키가_없으면_REFRESH_TOKEN_REQUIRED() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh").header(HttpHeaders.ORIGIN, ORIGIN))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("REFRESH_TOKEN_REQUIRED"));
        verifyNoInteractions(firestore);
    }

    @Test
    void 모양이_틀린_쿠키는_DB를_보지_않고_INVALID_REFRESH_TOKEN() throws Exception {
        refresh("not-a-session-token")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
        verifyNoInteractions(firestore);
    }

    @Test
    void 세션_문서가_없으면_INVALID_REFRESH_TOKEN() throws Exception {
        when(storedSession.exists()).thenReturn(false);

        refresh(REFRESH_TOKEN)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    void 저장된_해시와_다르면_INVALID_REFRESH_TOKEN() throws Exception {
        givenSession(LoginSessionIssuer.hash(SESSION_ID + ".other-secret"), Instant.now().plus(Duration.ofMinutes(30)), null, 0);

        refresh(REFRESH_TOKEN)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    void 로그아웃된_세션이면_SESSION_REVOKED() throws Exception {
        givenSession(LoginSessionIssuer.hash(REFRESH_TOKEN), Instant.now().plus(Duration.ofMinutes(30)), Timestamp.now(), 0);

        refresh(REFRESH_TOKEN)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_REVOKED"));
    }

    @Test
    void 최종_만료가_지났으면_SESSION_EXPIRED() throws Exception {
        givenSession(LoginSessionIssuer.hash(REFRESH_TOKEN), Instant.now().minusSeconds(1), null, 0);

        refresh(REFRESH_TOKEN)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_EXPIRED"));
    }

    @Test
    void 회원_문서가_없으면_SESSION_REVOKED() throws Exception {
        givenValidSession(Duration.ofMinutes(30), 0);
        when(storedMember.exists()).thenReturn(false);

        refresh(REFRESH_TOKEN)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_REVOKED"));
    }

    @Test
    void 비활성화된_회원이면_SESSION_REVOKED() throws Exception {
        givenValidSession(Duration.ofMinutes(30), 0);
        givenMember(false, null, "GENERAL");

        refresh(REFRESH_TOKEN)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_REVOKED"));
    }

    @Test
    void 관리_유형이_바뀌어_인증_버전이_오르면_SESSION_REVOKED() throws Exception {
        givenValidSession(Duration.ofMinutes(30), 0);
        givenMember(true, 1L, "ADMIN");

        refresh(REFRESH_TOKEN)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_REVOKED"));
    }

    @Test
    void 유효하면_access_token만_새로_주고_쿠키는_다시_보내지_않는다() throws Exception {
        Instant sessionExpiresAt = givenValidSession(Duration.ofMinutes(40), 2);
        givenMember(true, 2L, "ADMIN");

        MvcResult result = refresh(REFRESH_TOKEN)
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.expiresIn").value(900))
                .andExpect(jsonPath("$.data.user.userId").value(USER_ID))
                .andExpect(jsonPath("$.data.user.name").value("테스트 회원"))
                .andExpect(jsonPath("$.data.user.role").value("ADMIN"))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        // 최종 만료는 처음 로그인 때 정한 그대로다.
        assertThat(OffsetDateTime.parse(JsonPath.read(body, "$.data.sessionExpiresAt")).toInstant()).isEqualTo(sessionExpiresAt);
        Jwt claims = decode(JsonPath.read(body, "$.data.accessToken"));
        assertThat(claims.getSubject()).isEqualTo(USER_ID);
        assertThat(claims.getClaimAsString("sid")).isEqualTo(SESSION_ID);
        assertThat(claims.getClaimAsString("role")).isEqualTo("ADMIN");
        assertThat(Duration.between(claims.getIssuedAt(), claims.getExpiresAt())).isEqualTo(Duration.ofMinutes(15));
    }

    @Test
    void 최종_만료가_15분보다_가까우면_access_token도_그때_끝난다() throws Exception {
        Instant sessionExpiresAt = givenValidSession(Duration.ofMinutes(5), 0);
        givenMember(true, null, "GENERAL");

        MvcResult result = refresh(REFRESH_TOKEN).andExpect(status().isOk()).andReturn();

        String body = result.getResponse().getContentAsString();
        int expiresIn = JsonPath.read(body, "$.data.expiresIn");
        assertThat(expiresIn).isBetween(290, 300);
        assertThat(decode(JsonPath.read(body, "$.data.accessToken")).getExpiresAt()).isEqualTo(sessionExpiresAt);
    }

    @Test
    void 갱신도_허용되지_않은_출처면_403() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header(HttpHeaders.ORIGIN, "https://other.example.test")
                        .cookie(new Cookie("refreshToken", REFRESH_TOKEN)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("INVALID_ORIGIN"));
        verifyNoInteractions(firestore);
    }

    // ── 로그아웃 ──

    @Test
    void 쿠키가_없어도_200이고_쿠키를_지운다() throws Exception {
        expectCookieCleared(mockMvc.perform(post("/api/v1/auth/logout").header(HttpHeaders.ORIGIN, ORIGIN)));
        verifyNoInteractions(firestore);
    }

    @Test
    void 유효한_쿠키면_세션에_무효화_시각과_정리_기준을_적는다() throws Exception {
        givenValidSession(Duration.ofMinutes(30), 0);

        expectCookieCleared(logout(REFRESH_TOKEN));

        ArgumentCaptor<Map<String, Object>> fields = ArgumentCaptor.captor();
        verify(transaction).update(eq(sessionDocument), fields.capture());
        assertThat(fields.getValue()).containsOnlyKeys("revokedAt", "deleteAfter");
        assertThat(fields.getValue().get("revokedAt")).isInstanceOf(Timestamp.class)
                .isEqualTo(fields.getValue().get("deleteAfter"));
    }

    @Test
    void 해시가_다른_쿠키로는_세션을_건드리지_않는다() throws Exception {
        givenSession(LoginSessionIssuer.hash(SESSION_ID + ".other-secret"), Instant.now().plus(Duration.ofMinutes(30)), null, 0);

        expectCookieCleared(logout(REFRESH_TOKEN));
        verify(firestore, never()).runTransaction(any());
    }

    @Test
    void 이미_무효화된_세션은_다시_쓰지_않는다() throws Exception {
        givenSession(LoginSessionIssuer.hash(REFRESH_TOKEN), Instant.now().plus(Duration.ofMinutes(30)), Timestamp.now(), 0);

        expectCookieCleared(logout(REFRESH_TOKEN));
        verify(firestore, never()).runTransaction(any());
    }

    @Test
    void 무효화에_실패하면_500으로_알리고_쿠키는_지운다() throws Exception {
        givenValidSession(Duration.ofMinutes(30), 0);
        when(transaction.get(sessionDocument)).thenReturn(ApiFutures.immediateFailedFuture(new IllegalStateException()));

        logout(REFRESH_TOKEN)
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("refreshToken=;")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=/api/v1/auth")));
    }

    @Test
    void 로그아웃도_허용되지_않은_출처면_403() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout")
                        .header(HttpHeaders.ORIGIN, "https://other.example.test")
                        .cookie(new Cookie("refreshToken", REFRESH_TOKEN)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("INVALID_ORIGIN"))
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
        verifyNoInteractions(firestore);
    }

    // ── 도우미 ──

    private ResultActions refresh(String cookie) throws Exception {
        return mockMvc.perform(withCookie(post("/api/v1/auth/refresh"), cookie));
    }

    private ResultActions logout(String cookie) throws Exception {
        return mockMvc.perform(withCookie(post("/api/v1/auth/logout"), cookie));
    }

    private static MockHttpServletRequestBuilder withCookie(MockHttpServletRequestBuilder request, String cookie) {
        return request.header(HttpHeaders.ORIGIN, ORIGIN).cookie(new Cookie("refreshToken", cookie));
    }

    private static void expectCookieCleared(ResultActions result) throws Exception {
        result.andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("refreshToken=;")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=/api/v1/auth")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Secure")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("SameSite=Lax")))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(nullValue()));
    }

    /** 쿠키와 해시가 맞고, 지금부터 remaining 뒤에 끝나는 세션. 최종 만료 시각을 돌려준다 */
    private Instant givenValidSession(Duration remaining, long authVersion) {
        Instant expiresAt = Instant.now().plus(remaining).truncatedTo(ChronoUnit.SECONDS);
        givenSession(LoginSessionIssuer.hash(REFRESH_TOKEN), expiresAt, null, authVersion);
        return expiresAt;
    }

    private void givenSession(String refreshTokenHash, Instant expiresAt, Timestamp revokedAt, long authVersion) {
        when(storedSession.exists()).thenReturn(true);
        when(storedSession.getId()).thenReturn(SESSION_ID);
        when(storedSession.getString("userId")).thenReturn(USER_ID);
        when(storedSession.getLong("authVersion")).thenReturn(authVersion);
        when(storedSession.getString("refreshTokenHash")).thenReturn(refreshTokenHash);
        when(storedSession.getTimestamp("expiresAt"))
                .thenReturn(Timestamp.ofTimeSecondsAndNanos(expiresAt.getEpochSecond(), expiresAt.getNano()));
        when(storedSession.get("revokedAt")).thenReturn(revokedAt);
    }

    private void givenMember(boolean active, Long authVersion, String role) {
        when(storedMember.exists()).thenReturn(true);
        when(storedMember.getId()).thenReturn(USER_ID);
        when(storedMember.get("testIsActive")).thenReturn(active);
        when(storedMember.get("authVersion")).thenReturn(authVersion);
        when(storedMember.getString("name")).thenReturn("테스트 회원");
        when(storedMember.getString("role")).thenReturn(role);
    }

    private static Jwt decode(String accessToken) {
        var key = new SecretKeySpec(Base64.getDecoder().decode(TEST_SIGNING_KEY), "HmacSHA256");
        return NimbusJwtDecoder.withSecretKey(key).build().decode(accessToken);
    }
}
