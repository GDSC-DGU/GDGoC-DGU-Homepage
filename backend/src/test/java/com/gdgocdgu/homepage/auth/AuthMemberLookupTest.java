package com.gdgocdgu.homepage.auth;

import com.google.api.core.ApiFutures;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "AUTH_USERS_COLLECTION=testUsers",
        "AUTH_GOOGLE_SUB_FIELD=testGoogleSub",
        "AUTH_USER_ACTIVE_FIELD=testIsActive"
})
@AutoConfigureMockMvc
class AuthMemberLookupTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    GoogleTokenVerifier googleTokenVerifier;

    @MockitoBean
    Firestore firestore;

    private Query limitedQuery;

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
    }

    @Test
    void 활성_회원이면_세션_발급_전_단계인_501을_반환한다() throws Exception {
        givenMembers(member(true));

        login().andExpect(status().isNotImplemented());
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
        when(limitedQuery.get()).thenReturn(ApiFutures.immediateFailedFuture(new IllegalStateException()));

        login().andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"));
    }

    private ResultActions login() throws Exception {
        return mockMvc.perform(post("/api/v1/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"idToken\":\"test-token\"}"));
    }

    private void givenMembers(QueryDocumentSnapshot... documents) {
        QuerySnapshot snapshot = mock(QuerySnapshot.class);
        when(snapshot.getDocuments()).thenReturn(List.of(documents));
        when(limitedQuery.get()).thenReturn(ApiFutures.immediateFuture(snapshot));
    }

    private static QueryDocumentSnapshot member(Boolean active) {
        QueryDocumentSnapshot document = mock(QueryDocumentSnapshot.class);
        when(document.get("testIsActive")).thenReturn(active);
        return document;
    }
}
