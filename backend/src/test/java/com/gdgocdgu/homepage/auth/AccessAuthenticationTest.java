package com.gdgocdgu.homepage.auth;

import com.gdgocdgu.homepage.common.response.ApiResponse;
import com.google.api.core.ApiFutures;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "AUTH_USERS_COLLECTION=users",
        "AUTH_USER_ACTIVE_FIELD=isActive",
        "AUTH_ACCESS_TOKEN_SECRET=" + AuthMemberLookupTest.TEST_SIGNING_KEY
})
@AutoConfigureMockMvc
@Import(AccessAuthenticationTest.MemberTestController.class)
class AccessAuthenticationTest {

    private static final String MEMBER_PATH = "/test-support/auth/member";
    private static final String USER_ID = "test-member";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    LoginSessionIssuer sessionIssuer;

    @MockitoBean
    Firestore firestore;

    @Test
    void 유효한_세션이면_컨트롤러가_Firestore의_현재_역할을_받는다() throws Exception {
        LoginSession login = issueSession();
        givenValidSession(login);

        mockMvc.perform(get(MEMBER_PATH).header(HttpHeaders.AUTHORIZATION, bearer(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").value(USER_ID))
                .andExpect(jsonPath("$.data.role").value("GENERAL"));
    }

    @Test
    void 토큰_없이_사용자_ID와_역할을_보내도_인증되지_않는다() throws Exception {
        mockMvc.perform(get(MEMBER_PATH).param("userId", USER_ID).param("role", "ADMIN"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"));
        verifyNoInteractions(firestore);
    }

    @Test
    void 공개_API는_인증_헤더_없이_응답한다() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk());
        verifyNoInteractions(firestore);
    }

    @ParameterizedTest
    @EnumSource(InvalidSession.class)
    void 저장된_세션이나_회원이_유효하지_않으면_401을_반환한다(InvalidSession reason) throws Exception {
        LoginSession login = issueSession();
        SessionDocuments documents = givenValidSession(login);
        switch (reason) {
            case MISSING_SESSION -> when(documents.session().exists()).thenReturn(false);
            case MISSING_MEMBER -> when(documents.member().exists()).thenReturn(false);
            case REVOKED -> when(documents.session().get("revokedAt")).thenReturn(Timestamp.now());
            case EXPIRED -> when(documents.session().getTimestamp("expiresAt")).thenReturn(timestamp(Instant.now().minusSeconds(1)));
            case WRONG_OWNER -> when(documents.session().getString("userId")).thenReturn("different-member");
            case INACTIVE -> when(documents.member().get("isActive")).thenReturn(false);
            case CHANGED_AUTH_VERSION -> when(documents.member().get("authVersion")).thenReturn(1L);
        }

        mockMvc.perform(get(MEMBER_PATH).header(HttpHeaders.AUTHORIZATION, bearer(login)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"));
    }

    @Test
    void Firestore_조회_실패는_500을_반환한다() throws Exception {
        LoginSession login = issueSession();
        DocumentReference session = ref("authSessions", login.id());
        DocumentReference member = ref("users", USER_ID);
        when(firestore.getAll(session, member))
                .thenReturn(ApiFutures.immediateFailedFuture(new IllegalStateException("테스트 조회 실패")));

        mockMvc.perform(get(MEMBER_PATH).header(HttpHeaders.AUTHORIZATION, bearer(login)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"));
    }

    private LoginSession issueSession() {
        return sessionIssuer.issue(new LoginMember(USER_ID, "테스트 회원", "ADMIN", true, 0));
    }

    private SessionDocuments givenValidSession(LoginSession login) {
        DocumentSnapshot session = mock(DocumentSnapshot.class);
        when(session.exists()).thenReturn(true);
        when(session.getString("userId")).thenReturn(USER_ID);
        when(session.getTimestamp("expiresAt")).thenReturn(timestamp(login.expiresAt()));
        when(session.get("authVersion")).thenReturn(0L);

        DocumentSnapshot member = mock(DocumentSnapshot.class);
        when(member.exists()).thenReturn(true);
        when(member.getId()).thenReturn(USER_ID);
        when(member.get("isActive")).thenReturn(true);
        when(member.getString("role")).thenReturn("GENERAL");

        DocumentReference sessionRef = ref("authSessions", login.id());
        DocumentReference memberRef = ref("users", USER_ID);
        when(firestore.getAll(sessionRef, memberRef)).thenReturn(ApiFutures.immediateFuture(List.of(session, member)));
        return new SessionDocuments(session, member);
    }

    private DocumentReference ref(String collectionName, String id) {
        CollectionReference collection = mock(CollectionReference.class);
        DocumentReference document = mock(DocumentReference.class);
        when(firestore.collection(collectionName)).thenReturn(collection);
        when(collection.document(id)).thenReturn(document);
        return document;
    }

    private static Timestamp timestamp(Instant instant) {
        return Timestamp.ofTimeSecondsAndNanos(instant.getEpochSecond(), instant.getNano());
    }

    private static String bearer(LoginSession session) {
        return "Bearer " + session.accessToken();
    }

    private record SessionDocuments(DocumentSnapshot session, DocumentSnapshot member) {
    }

    private enum InvalidSession {
        MISSING_SESSION, MISSING_MEMBER, REVOKED, EXPIRED, WRONG_OWNER, INACTIVE, CHANGED_AUTH_VERSION
    }

    @TestComponent
    @RestController
    static class MemberTestController {

        @GetMapping(MEMBER_PATH)
        ApiResponse<AuthenticatedMember> currentMember(AuthenticatedMember member) {
            return ApiResponse.ok(member);
        }
    }
}
