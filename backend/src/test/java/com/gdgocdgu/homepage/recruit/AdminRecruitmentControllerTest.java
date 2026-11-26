package com.gdgocdgu.homepage.recruit;

import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.gdgocdgu.homepage.auth.AuthTestSessions;
import com.gdgocdgu.homepage.common.firestore.FirestoreFutures;
import com.gdgocdgu.homepage.common.firestore.FirestoreProperties;
import com.gdgocdgu.homepage.support.FirestoreEmulator;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** 운영진 회차 API를 에뮬레이터의 실제 문서와 실제 로그인 세션으로 확인한다. 에뮬레이터가 꺼져 있으면 건너뛴다. */
@SpringBootTest(properties = {
        "AUTH_USERS_COLLECTION=users",
        "AUTH_USER_ACTIVE_FIELD=isActive",
        "AUTH_ACCESS_TOKEN_SECRET=" + AuthTestSessions.SIGNING_KEY
})
@AutoConfigureMockMvc
class AdminRecruitmentControllerTest {

    static final String LIST = "/api/v1/admin/recruitments";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    Firestore firestore;

    @Autowired
    FirestoreProperties properties;

    @BeforeEach
    void 에뮬레이터를_비운다() throws Exception {
        assumeTrue(FirestoreEmulator.isRunning(properties), "에뮬레이터가 꺼져 있음");
        FirestoreEmulator.clear(properties);
    }

    @Test
    void 운영진은_최신_기수_순_목록과_삭제되지_않은_지원자_수를_받는다() throws Exception {
        saveRecruitment(5, "OPEN", 3);
        saveRecruitment(6, "DRAFT", null);
        saveApplication("a_1", "rct_5", false);
        saveApplication("a_2", "rct_5", false);
        saveApplication("a_3", "rct_5", true);
        saveApplication("a_4", "rct_6", false);

        mockMvc.perform(get(LIST).header(HttpHeaders.AUTHORIZATION, AuthTestSessions.adminBearer(firestore)))
                .andExpect(status().isOk())
                .andExpect(content().string("{\"success\":true,\"data\":{\"recruitments\":["
                        + "{\"rid\":\"rct_6\",\"cohort\":6,\"title\":\"GDGoC DGU 6기 멤버 모집\",\"status\":\"DRAFT\","
                        + "\"applyStartAt\":\"2000-01-01T09:00:00+09:00\",\"applyEndAt\":\"2999-01-01T09:00:00+09:00\","
                        + "\"applyState\":\"NOT_PUBLISHED\",\"applicationCount\":1},"
                        + "{\"rid\":\"rct_5\",\"cohort\":5,\"title\":\"GDGoC DGU 5기 멤버 모집\",\"status\":\"OPEN\","
                        + "\"applyStartAt\":\"2000-01-01T09:00:00+09:00\",\"applyEndAt\":\"2999-01-01T09:00:00+09:00\","
                        + "\"applyState\":\"OPEN\",\"applicationCount\":2}],"
                        + "\"pagination\":{\"page\":1,\"pageSize\":20,\"totalCount\":2,\"totalPages\":1}}}"));
    }

    @Test
    void 일반_회원은_403이다() throws Exception {
        mockMvc.perform(get(LIST).header(HttpHeaders.AUTHORIZATION, AuthTestSessions.generalBearer(firestore)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void 토큰이_없으면_401이다() throws Exception {
        mockMvc.perform(get(LIST))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"));
    }

    @Test
    void 페이지_크기가_100을_넘으면_400이다() throws Exception {
        mockMvc.perform(get(LIST).param("pageSize", "101")
                        .header(HttpHeaders.AUTHORIZATION, AuthTestSessions.adminBearer(firestore)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void 회차를_만들면_201과_DRAFT_문서가_생기고_같은_기수는_409다() throws Exception {
        String body = """
                {"cohort":7,"title":"GDGoC DGU 7기 멤버 모집","applyStartAt":"2027-02-20T00:00:00+09:00",
                 "applyEndAt":"2027-03-05T23:59:59+09:00","tracks":["BE","FE"],"noticeMarkdown":"모집 안내"}""";

        send(post(LIST), body)
                .andExpect(status().isCreated())
                .andExpect(content().string("{\"success\":true,\"data\":{\"rid\":\"rct_7\",\"cohort\":7,\"status\":\"DRAFT\"}}"));

        DocumentSnapshot doc = recruitment("rct_7");
        assertThat(doc.getString("status")).isEqualTo("DRAFT");
        assertThat(doc.getBoolean("closedManually")).isFalse();
        assertThat(doc.getBoolean("membersRegistered")).isFalse();
        assertThat(doc.get("publishedFormVersion")).isNull();
        assertThat(doc.get("currentCriteriaVersion")).isNull();
        assertThat(doc.getTimestamp("applyStartAt")).isEqualTo(Timestamp.parseTimestamp("2027-02-19T15:00:00Z"));
        assertThat(doc.getString("createdBy")).isEqualTo("test-admin");
        assertThat(doc.getBoolean("stages.DOCUMENT.confirmed")).isFalse();

        send(post(LIST), body)
                .andExpect(status().isConflict())
                .andExpect(content().string(
                        "{\"success\":false,\"code\":\"COHORT_EXISTS\",\"message\":\"7기 모집 회차가 이미 있습니다.\"}"));
    }

    @Test
    void 수동_마감하면_수정된_회차와_CLOSED_MANUALLY를_돌려준다() throws Exception {
        saveRecruitment(5, "OPEN", 3);

        send(patch(LIST + "/rct_5"), "{\"status\":\"CLOSED\",\"title\":\"5기 모집(마감)\"}")
                .andExpect(status().isOk())
                .andExpect(content().string("{\"success\":true,\"data\":{\"rid\":\"rct_5\",\"cohort\":5,"
                        + "\"title\":\"5기 모집(마감)\",\"status\":\"CLOSED\","
                        + "\"applyStartAt\":\"2000-01-01T09:00:00+09:00\",\"applyEndAt\":\"2999-01-01T09:00:00+09:00\","
                        + "\"tracks\":[\"BE\",\"FE\"],\"noticeMarkdown\":\"안내\",\"applyState\":\"CLOSED_MANUALLY\"}}"));

        DocumentSnapshot doc = recruitment("rct_5");
        assertThat(doc.getBoolean("closedManually")).isTrue();
        assertThat(doc.getString("updatedBy")).isEqualTo("test-admin");
    }

    @Test
    void 폼_게시_전_DRAFT를_SCHEDULED로_바꾸면_409_FORM_NOT_PUBLISHED다() throws Exception {
        saveRecruitment(6, "DRAFT", null);

        send(patch(LIST + "/rct_6"), "{\"status\":\"SCHEDULED\"}")
                .andExpect(status().isConflict())
                .andExpect(content().string(
                        "{\"success\":false,\"code\":\"FORM_NOT_PUBLISHED\",\"message\":\"지원폼을 먼저 게시해주세요.\"}"));
    }

    @Test
    void 지원서가_없으면_기수를_바꾸고_폼과_기준을_새_ID로_옮긴다() throws Exception {
        saveRecruitment(5, "DRAFT", null);
        FirestoreFutures.await(firestore.collection("recruitments").document("rct_5")
                .collection("formVersions").document("1").set(Map.of("version", 1, "status", "DRAFT")));
        FirestoreFutures.await(firestore.collection("recruitments").document("rct_5")
                .collection("criteriaVersions").document("1").set(Map.of("version", 1)));

        send(patch(LIST + "/rct_5"), "{\"cohort\":8}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rid").value("rct_8"))
                .andExpect(jsonPath("$.data.cohort").value(8));

        assertThat(recruitment("rct_5").exists()).isFalse();
        assertThat(recruitment("rct_8").getLong("cohort")).isEqualTo(8);
        assertThat(recruitment("rct_8").getString("title")).isEqualTo("GDGoC DGU 5기 멤버 모집");
        assertThat(sub("rct_8", "formVersions", "1").getString("status")).isEqualTo("DRAFT");
        assertThat(sub("rct_8", "criteriaVersions", "1").exists()).isTrue();
        assertThat(sub("rct_5", "formVersions", "1").exists()).isFalse();
    }

    @Test
    void 지원서가_있거나_이미_있는_기수면_기수를_바꾸지_않는다() throws Exception {
        saveRecruitment(5, "OPEN", 3);
        saveRecruitment(9, "DRAFT", null);
        saveApplication("a_1", "rct_5", false);

        send(patch(LIST + "/rct_5"), "{\"cohort\":8}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COHORT_LOCKED"));
        send(patch(LIST + "/rct_9"), "{\"cohort\":5}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COHORT_EXISTS"));

        assertThat(recruitment("rct_5").getLong("cohort")).isEqualTo(5);
        assertThat(recruitment("rct_9").getLong("cohort")).isEqualTo(9);
    }

    @Test
    void 없는_회차를_고치면_404다() throws Exception {
        send(patch(LIST + "/rct_404"), "{\"title\":\"x\"}")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    private ResultActions send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request,
            String body) throws Exception {
        return mockMvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(body)
                .header(HttpHeaders.AUTHORIZATION, AuthTestSessions.adminBearer(firestore)));
    }

    private DocumentSnapshot recruitment(String rid) {
        return FirestoreFutures.await(firestore.collection("recruitments").document(rid).get());
    }

    private DocumentSnapshot sub(String rid, String collection, String id) {
        return FirestoreFutures.await(firestore.collection("recruitments").document(rid)
                .collection(collection).document(id).get());
    }

    private void saveRecruitment(int cohort, String status, Integer publishedFormVersion) {
        Map<String, Object> doc = new HashMap<>();
        doc.put("cohort", cohort);
        doc.put("title", "GDGoC DGU " + cohort + "기 멤버 모집");
        doc.put("status", status);
        doc.put("closedManually", false);
        doc.put("applyStartAt", Timestamp.parseTimestamp("2000-01-01T00:00:00Z"));
        doc.put("applyEndAt", Timestamp.parseTimestamp("2999-01-01T00:00:00Z"));
        doc.put("tracks", List.of("BE", "FE"));
        doc.put("noticeMarkdown", "안내");
        doc.put("publishedFormVersion", publishedFormVersion);
        FirestoreFutures.await(firestore.collection("recruitments").document("rct_" + cohort).set(doc));
    }

    private void saveApplication(String aid, String rid, boolean deleted) {
        FirestoreFutures.await(firestore.collection("applications").document(aid)
                .set(Map.of("rid", rid, "deleted", deleted)));
    }
}
