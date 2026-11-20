package com.gdgocdgu.homepage.auth;

import com.google.api.core.ApiFutures;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.Transaction;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "AUTH_USERS_COLLECTION=testUsers",
        "AUTH_GOOGLE_SUB_FIELD=testGoogleSub",
        "AUTH_USER_ACTIVE_FIELD=testIsActive",
        "AUTH_ACCESS_TOKEN_SECRET=" + AuthMemberLookupTest.TEST_SIGNING_KEY,
        "app.auth.allowed-origins=https://frontend.example.test",
        "app.auth.refresh-cookie-secure=true"
})
@AutoConfigureMockMvc
class AuthMemberLookupTest {

    static final String TEST_SIGNING_KEY = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    GoogleTokenVerifier googleTokenVerifier;

    @MockitoBean
    Firestore firestore;

    private Query limitedQuery;
    private Transaction transaction;
    private CollectionReference sessions;
    private DocumentReference sessionDocument;

    @BeforeEach
    void setUp() throws Exception {
        // Google 검증을 통과한 뒤 받은 계정 ID로 실제 조회 흐름을 확인한다.
        when(googleTokenVerifier.verify("test-token")).thenReturn(Optional.of("test-sub"));
        CollectionReference users = mock(CollectionReference.class);
        Query linkedUsers = mock(Query.class);
        limitedQuery = mock(Query.class);
        when(firestore.collection("testUsers")).thenReturn(users);
        when(users.whereEqualTo("testGoogleSub", "test-sub")).thenReturn(linkedUsers);
        when(linkedUsers.limit(2)).thenReturn(limitedQuery);
        transaction = mock(Transaction.class);
        sessions = mock(CollectionReference.class);
        sessionDocument = mock(DocumentReference.class);
        when(firestore.collection("authSessions")).thenReturn(sessions);
        when(sessions.document(anyString())).thenReturn(sessionDocument);
        when(firestore.runTransaction(any())).thenAnswer(invocation -> {
            Transaction.Function<?> work = invocation.getArgument(0);
            try {
                return ApiFutures.immediateFuture(work.updateCallback(transaction));
            } catch (Exception e) {
                return ApiFutures.immediateFailedFuture(e);
            }
        });
    }

    @Test
    void 연결된_회원이_없으면_403을_반환한다() throws Exception {
        givenMembers();

        login().andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("GOOGLE_ACCOUNT_NOT_LINKED"));
    }

    @Test
    void 비활성_회원이면_403을_반환한다() throws Exception {
        givenMembers(member(false));

        login().andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("USER_INACTIVE"));
        verifyNoInteractions(sessions);
    }

    @Test
    void 활성_회원이면_서명한_토큰과_쿠키를_발급하고_세션을_저장한다() throws Exception {
        givenMembers(member(true));

        MvcResult login = mockMvc.perform(post("/api/v1/auth/google")
                        .header(HttpHeaders.ORIGIN, "https://frontend.example.test")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"test-token\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Secure")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("SameSite=Lax")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=/api/v1/auth")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=3600")))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.expiresIn").value(900))
                .andExpect(jsonPath("$.data.user.userId").value("usr_test_001"))
                .andExpect(jsonPath("$.data.user.name").value("테스트 회원"))
                .andExpect(jsonPath("$.data.user.role").value("GENERAL"))
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist())
                .andReturn();

        String body = login.getResponse().getContentAsString();
        String accessToken = JsonPath.read(body, "$.data.accessToken");
        String expiresAt = JsonPath.read(body, "$.data.sessionExpiresAt");
        String cookie = login.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(cookie).startsWith("refreshToken=");
        String refreshToken = cookie.split(";", 2)[0].substring("refreshToken=".length());

        var key = new SecretKeySpec(Base64.getDecoder().decode(TEST_SIGNING_KEY), "HmacSHA256");
        Jwt claims = NimbusJwtDecoder.withSecretKey(key).build().decode(accessToken);
        assertThat(claims.getSubject()).isEqualTo("usr_test_001");
        assertThat(claims.getClaimAsString("iss")).isEqualTo("gdgoc-dgu-homepage");
        assertThat(claims.getClaimAsString("role")).isEqualTo("GENERAL");
        assertThat(Duration.between(claims.getIssuedAt(), claims.getExpiresAt())).isEqualTo(Duration.ofMinutes(15));
        assertThat(refreshToken).startsWith(claims.getClaimAsString("sid") + ".");
        verify(sessions).document(claims.getClaimAsString("sid"));

        ArgumentCaptor<Map<String, Object>> savedSession = ArgumentCaptor.captor();
        verify(transaction).create(eq(sessionDocument), savedSession.capture());
        String expectedHash = Base64.getUrlEncoder().withoutPadding().encodeToString(
                MessageDigest.getInstance("SHA-256").digest(refreshToken.getBytes(StandardCharsets.UTF_8)));
        Map<String, Object> stored = savedSession.getValue();
        assertThat(stored).containsEntry("userId", "usr_test_001")
                .containsEntry("authVersion", 0L)
                .containsEntry("refreshTokenHash", expectedHash)
                .containsEntry("revokedAt", null)
                .doesNotContainKeys("refreshToken", "accessToken");
        Timestamp storedExpiry = (Timestamp) stored.get("expiresAt");
        assertThat(stored.get("deleteAfter")).isEqualTo(storedExpiry);
        assertThat(OffsetDateTime.parse(expiresAt).toInstant()).isEqualTo(claims.getIssuedAt().plus(Duration.ofHours(1)));
        assertThat(storedExpiry.getSeconds()).isEqualTo(OffsetDateTime.parse(expiresAt).toEpochSecond());
    }

    @Test
    void 허용되지_않은_출처에는_세션을_발급하지_않는다() throws Exception {
        mockMvc.perform(post("/api/v1/auth/google")
                        .header(HttpHeaders.ORIGIN, "https://other.example.test")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"test-token\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("INVALID_ORIGIN"))
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
        verifyNoInteractions(firestore);
    }

    @Test
    void 활성_회원의_필수_회원_정보가_없으면_세션을_발급하지_않는다() throws Exception {
        QueryDocumentSnapshot incomplete = mock(QueryDocumentSnapshot.class);
        when(incomplete.get("testIsActive")).thenReturn(true);
        givenMembers(incomplete);

        login().andExpect(status().isInternalServerError())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
        verifyNoInteractions(sessions);
    }

    @Test
    void 중복_연결이면_서버_오류를_반환한다() throws Exception {
        givenMembers(member(true), member(true));

        login().andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"));
    }

    @Test
    void 활성_여부를_읽을_수_없으면_서버_오류를_반환한다() throws Exception {
        givenMembers(member(null));

        login().andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"));
    }

    @Test
    void 회원_조회가_실패하면_서버_오류를_반환한다() throws Exception {
        when(transaction.get(limitedQuery)).thenReturn(ApiFutures.immediateFailedFuture(new IllegalStateException()));

        login().andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
    }

    private ResultActions login() throws Exception {
        return mockMvc.perform(post("/api/v1/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"idToken\":\"test-token\"}"));
    }

    private void givenMembers(QueryDocumentSnapshot... documents) {
        QuerySnapshot snapshot = mock(QuerySnapshot.class);
        when(snapshot.getDocuments()).thenReturn(List.of(documents));
        when(transaction.get(limitedQuery)).thenReturn(ApiFutures.immediateFuture(snapshot));
    }

    private static QueryDocumentSnapshot member(Boolean active) {
        QueryDocumentSnapshot document = mock(QueryDocumentSnapshot.class);
        when(document.get("testIsActive")).thenReturn(active);
        when(document.getId()).thenReturn("usr_test_001");
        when(document.getString("name")).thenReturn("테스트 회원");
        when(document.getString("role")).thenReturn("GENERAL");
        return document;
    }
}
