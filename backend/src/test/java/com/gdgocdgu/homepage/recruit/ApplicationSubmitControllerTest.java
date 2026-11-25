package com.gdgocdgu.homepage.recruit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.gdgocdgu.homepage.common.firestore.FirestoreFutures;
import com.gdgocdgu.homepage.common.firestore.FirestoreProperties;
import com.gdgocdgu.homepage.support.FirestoreEmulator;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.jayway.jsonpath.JsonPath;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** API-RCT-005를 에뮬레이터의 실제 트랜잭션으로 확인한다. 에뮬레이터가 꺼져 있으면 건너뛴다. */
@SpringBootTest(properties = "RECRUIT_KEY_HMAC_SECRET=" + ApplicationKeyGeneratorTest.SECRET)
@AutoConfigureMockMvc
class ApplicationSubmitControllerTest {

    static final String BODY = """
            {"applicant":{"name":"홍길동","studentId":"2023123456","major":"컴퓨터AI학부",
              "email":"Hong@DGU.ac.kr","phone":"010-0000-0000"},
             "track":"BE","answers":[{"questionId":"q1","value":"지원 동기 답변"}],
             "privacyConsent":true,"formVersion":3}""";

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
    void 제출하면_201과_함께_지원서와_중복_키를_저장한다() throws Exception {
        saveRecruitment(2);

        String body = submit(BODY)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.aid").value(org.hamcrest.Matchers.matchesPattern("a_[0-9a-z]{12}")))
                .andExpect(jsonPath("$.data.submittedAt")
                        .value(org.hamcrest.Matchers.matchesPattern("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\+09:00")))
                .andReturn().getResponse().getContentAsString();
        String aid = JsonPath.read(body, "$.data.aid");

        DocumentSnapshot app = FirestoreFutures.await(firestore.collection("applications").document(aid).get());
        assertThat(app.getString("rid")).isEqualTo("rct_5");
        assertThat(app.getLong("cohort")).isEqualTo(5);
        assertThat(app.getLong("formVersion")).isEqualTo(3);
        assertThat(app.getString("applicant.studentId")).isEqualTo("2023123456");
        assertThat(app.getString("applicant.email")).isEqualTo("hong@dgu.ac.kr");
        assertThat(app.getString("track")).isEqualTo("BE");
        assertThat(app.get("answers")).isEqualTo(List.of(Map.of("questionId", "q1", "value", "지원 동기 답변")));
        assertThat(app.getBoolean("privacyConsent.agreed")).isTrue();
        assertThat(app.getBoolean("deleted")).isFalse();
        assertThat(app.getString("currentStage")).isEqualTo("DOCUMENT");
        assertThat(app.getString("stages.DOCUMENT.result")).isEqualTo("PENDING");
        assertThat(app.getString("stages.INTERVIEW.mailStatus")).isEqualTo("NOT_SENT");
        assertThat(app.getString("scoring.status")).isEqualTo("PENDING");
        assertThat(app.getLong("scoring.criteriaVersion")).isEqualTo(2);
        assertThat(app.getLong("scoring.attempts")).isZero();
        assertThat(app.getTimestamp("scoring.requestedAt")).isEqualTo(app.getTimestamp("submittedAt"));
        assertThat(app.contains("scoring.runId")).isTrue();

        assertThat(key(ApplicationKeyGeneratorTest.KEY_OF_2023123456).getString("aid")).isEqualTo(aid);
        assertThat(key(ApplicationKeyGeneratorTest.KEY_OF_HONG_EMAIL).getString("aid")).isEqualTo(aid);
    }

    @Test
    void 같은_학번이나_대소문자만_다른_이메일은_409_APPLICATION_DUPLICATED다() throws Exception {
        saveRecruitment(2);
        submit(BODY).andExpect(status().isCreated());

        submit(BODY.replace("Hong@DGU.ac.kr", "other@dgu.ac.kr")).andExpect(status().isConflict())
                .andExpect(content().string("{\"success\":false,\"code\":\"APPLICATION_DUPLICATED\","
                        + "\"message\":\"이미 제출된 지원서가 있습니다.\"}"));
        submit(BODY.replace("2023123456", "2023999999").replace("Hong@DGU.ac.kr", "HONG@dgu.ac.kr"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("APPLICATION_DUPLICATED"));
    }

    @Test
    void 게시_버전과_다르면_409_FORM_CHANGED다() throws Exception {
        saveRecruitment(2);

        submit(BODY.replace("\"formVersion\":3", "\"formVersion\":2"))
                .andExpect(status().isConflict())
                .andExpect(content().string("{\"success\":false,\"code\":\"FORM_CHANGED\","
                        + "\"message\":\"지원폼이 변경되었습니다. 새로고침 후 다시 작성해주세요.\"}"));
    }

    @Test
    void 없는_회차는_409_RECRUITMENT_CLOSED다() throws Exception {
        submit(BODY).andExpect(status().isConflict())
                .andExpect(content().string("{\"success\":false,\"code\":\"RECRUITMENT_CLOSED\","
                        + "\"message\":\"지원 기간이 아닙니다.\"}"));
    }

    @Test
    void 필수_문항이_빠지면_400_VALIDATION_FAILED다() throws Exception {
        saveRecruitment(2);

        submit(BODY.replace("\"지원 동기 답변\"", "\"\""))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("{\"success\":false,\"code\":\"VALIDATION_FAILED\","
                        + "\"message\":\"입력 값을 확인해주세요.\"}"));
    }

    @Test
    void 평가_기준_버전이_없는_회차는_저장하지_않고_500이다() throws Exception {
        saveRecruitment(null);

        submit(BODY).andExpect(status().isInternalServerError());

        assertThat(FirestoreFutures.await(firestore.collection("applications").get()).isEmpty()).isTrue();
    }

    private ResultActions submit(String body) throws Exception {
        return mockMvc.perform(post("/api/v1/recruitments/rct_5/applications")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private DocumentSnapshot key(String keyId) {
        return FirestoreFutures.await(firestore.collection("recruitments").document("rct_5")
                .collection("applicationKeys").document(keyId).get());
    }

    private void saveRecruitment(Integer currentCriteriaVersion) {
        Map<String, Object> doc = new HashMap<>();
        doc.put("cohort", 5);
        doc.put("title", "GDGoC DGU 5기 멤버 모집");
        doc.put("status", "OPEN");
        doc.put("closedManually", false);
        doc.put("applyStartAt", Timestamp.parseTimestamp("2000-01-01T00:00:00Z"));
        doc.put("applyEndAt", Timestamp.parseTimestamp("2999-01-01T00:00:00Z"));
        doc.put("tracks", List.of("BE", "FE"));
        doc.put("noticeMarkdown", "안내");
        doc.put("publishedFormVersion", 3);
        doc.put("currentCriteriaVersion", currentCriteriaVersion);
        DocumentReference recruitment = firestore.collection("recruitments").document("rct_5");
        FirestoreFutures.await(recruitment.set(doc));

        Map<String, Object> question = new HashMap<>();
        question.put("questionId", "q1");
        question.put("type", "LONG_TEXT");
        question.put("title", "지원 동기");
        question.put("description", null);
        question.put("required", true);
        question.put("maxLength", 1000);
        question.put("options", List.of());
        question.put("trackOnly", List.of());
        FirestoreFutures.await(recruitment.collection("formVersions").document("3")
                .set(Map.of("version", 3, "status", "PUBLISHED", "questions", List.of(question))));
    }
}
