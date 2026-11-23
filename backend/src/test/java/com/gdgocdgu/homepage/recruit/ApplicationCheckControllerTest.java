package com.gdgocdgu.homepage.recruit;

import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** API-RCT-003을 에뮬레이터에 실제로 저장한 키 문서로 확인한다. 에뮬레이터가 꺼져 있으면 건너뛴다. */
@SpringBootTest(properties = "RECRUIT_KEY_HMAC_SECRET=" + ApplicationKeyGeneratorTest.SECRET)
@AutoConfigureMockMvc
class ApplicationCheckControllerTest {

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
    void 이미_지원한_학번이면_duplicated가_true다() throws Exception {
        DocumentReference recruitment = saveRecruitment();
        FirestoreFutures.await(recruitment.collection(FirestoreApplicationKeyRepository.COLLECTION)
                .document(ApplicationKeyGeneratorTest.KEY_OF_2023123456)
                .set(Map.of("aid", "a_test", "createdAt", Timestamp.now())));

        check("rct_5", "{\"studentId\":\" 2023123456 \"}")
                .andExpect(status().isOk())
                .andExpect(content().string("{\"success\":true,\"data\":{\"duplicated\":true}}"));
    }

    @Test
    void 지원하지_않은_학번이면_duplicated가_false다() throws Exception {
        saveRecruitment();

        check("rct_5", "{\"studentId\":\"2023999999\"}")
                .andExpect(status().isOk())
                .andExpect(content().string("{\"success\":true,\"data\":{\"duplicated\":false}}"));
    }

    @Test
    void 학번_형식이_틀리면_400이다() throws Exception {
        saveRecruitment();

        check("rct_5", "{\"studentId\":\"12345\"}")
                .andExpect(status().isBadRequest())
                .andExpect(content().string(
                        "{\"success\":false,\"code\":\"VALIDATION_FAILED\",\"message\":\"학번 형식이 올바르지 않습니다.\"}"));
    }

    private ResultActions check(String rid, String body) throws Exception {
        return mockMvc.perform(post("/api/v1/recruitments/" + rid + "/applications/check")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private DocumentReference saveRecruitment() {
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
        DocumentReference reference = firestore.collection(FirestoreRecruitmentRepository.COLLECTION).document("rct_5");
        FirestoreFutures.await(reference.set(doc));
        return reference;
    }
}
