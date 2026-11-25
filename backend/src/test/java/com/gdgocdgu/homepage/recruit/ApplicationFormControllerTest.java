package com.gdgocdgu.homepage.recruit;

import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.gdgocdgu.homepage.common.firestore.FirestoreFutures;
import com.gdgocdgu.homepage.common.firestore.FirestoreProperties;
import com.gdgocdgu.homepage.support.FirestoreEmulator;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/** API-RCT-002를 에뮬레이터에 실제로 저장한 문서로 확인한다. 에뮬레이터가 꺼져 있으면 건너뛴다. */
@SpringBootTest
@AutoConfigureMockMvc
class ApplicationFormControllerTest {

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
    void 게시된_폼을_명세_형식으로_돌려준다() throws Exception {
        DocumentReference recruitment = saveRecruitment("OPEN", 3);
        saveForm(recruitment, 3, List.of(
                question("q1", "LONG_TEXT", "지원 동기를 적어주세요.", "1000자 이내", true, 1000, List.of(), List.of()),
                question("q2", "MULTI_CHOICE", "관심 분야", null, false, null, List.of("BE", "AI"), List.of("BE"))));
        saveForm(recruitment, 4, List.of(
                question("draft", "SHORT_TEXT", "게시 전 문항", null, true, 100, List.of(), List.of())));

        mockMvc.perform(get("/api/v1/recruitments/rct_5/form"))
                .andExpect(status().isOk())
                .andExpect(content().string("{\"success\":true,\"data\":{\"rid\":\"rct_5\",\"formVersion\":3,"
                        + "\"questions\":["
                        + "{\"questionId\":\"q1\",\"type\":\"LONG_TEXT\",\"title\":\"지원 동기를 적어주세요.\","
                        + "\"description\":\"1000자 이내\",\"required\":true,\"maxLength\":1000,"
                        + "\"options\":[],\"trackOnly\":[]},"
                        + "{\"questionId\":\"q2\",\"type\":\"MULTI_CHOICE\",\"title\":\"관심 분야\","
                        + "\"description\":null,\"required\":false,\"maxLength\":null,"
                        + "\"options\":[\"BE\",\"AI\"],\"trackOnly\":[\"BE\"]}]}}"));
    }

    @Test
    void 게시된_폼이_없으면_404_FORM_NOT_PUBLISHED다() throws Exception {
        saveRecruitment("SCHEDULED", null);

        mockMvc.perform(get("/api/v1/recruitments/rct_5/form"))
                .andExpect(status().isNotFound())
                .andExpect(content().string(
                        "{\"success\":false,\"code\":\"FORM_NOT_PUBLISHED\",\"message\":\"게시된 지원폼이 없습니다.\"}"));
    }

    @Test
    void 없는_회차도_404_FORM_NOT_PUBLISHED다() throws Exception {
        mockMvc.perform(get("/api/v1/recruitments/rct_404/form"))
                .andExpect(status().isNotFound())
                .andExpect(content().string(
                        "{\"success\":false,\"code\":\"FORM_NOT_PUBLISHED\",\"message\":\"게시된 지원폼이 없습니다.\"}"));
    }

    private DocumentReference saveRecruitment(String status, Integer publishedFormVersion) {
        Map<String, Object> doc = new HashMap<>();
        doc.put("cohort", 5);
        doc.put("title", "GDGoC DGU 5기 멤버 모집");
        doc.put("status", status);
        doc.put("closedManually", false);
        doc.put("applyStartAt", Timestamp.parseTimestamp("2000-01-01T00:00:00Z"));
        doc.put("applyEndAt", Timestamp.parseTimestamp("2999-01-01T00:00:00Z"));
        doc.put("tracks", List.of("BE", "FE"));
        doc.put("noticeMarkdown", "안내");
        doc.put("publishedFormVersion", publishedFormVersion);
        DocumentReference reference = firestore.collection(FirestoreRecruitmentRepository.COLLECTION).document("rct_5");
        FirestoreFutures.await(reference.set(doc));
        return reference;
    }

    private void saveForm(DocumentReference recruitment, int version, List<Map<String, Object>> questions) {
        Map<String, Object> doc = Map.of("version", version, "status", "PUBLISHED", "questions", questions);
        FirestoreFutures.await(recruitment.collection(FirestoreFormVersionRepository.COLLECTION)
                .document(String.valueOf(version)).set(doc));
    }

    private static Map<String, Object> question(String questionId, String type, String title, String description,
            boolean required, Integer maxLength, List<String> options, List<String> trackOnly) {
        Map<String, Object> question = new HashMap<>();
        question.put("questionId", questionId);
        question.put("type", type);
        question.put("title", title);
        question.put("description", description);
        question.put("required", required);
        question.put("maxLength", maxLength);
        question.put("options", options);
        question.put("trackOnly", trackOnly);
        return question;
    }
}
