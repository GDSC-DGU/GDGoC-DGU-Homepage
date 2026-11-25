package com.gdgocdgu.homepage.recruit;

import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.gdgocdgu.homepage.common.firestore.FirestoreFutures;
import com.gdgocdgu.homepage.common.firestore.FirestoreProperties;
import com.gdgocdgu.homepage.support.FirestoreEmulator;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.Firestore;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/**
 * API-RCT-001을 에뮬레이터에 실제로 저장한 문서로 확인한다(저장 필드 이름 · 변환 · 응답 형식).
 * 에뮬레이터가 꺼져 있으면 건너뛴다. CI는 에뮬레이터를 띄운 채 실행한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
class RecruitmentControllerTest {

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
    void 현재_회차를_명세_형식으로_돌려준다() throws Exception {
        // 지원 기간을 넓게 잡아 실행 시각과 상관없이 OPEN이 되게 한다.
        save("rct_5", recruitmentDoc(5, "OPEN", "1999-12-31T15:00:00Z", "2999-12-31T14:59:59Z"));
        // DRAFT는 시작일이 더 늦어도 공개 대상이 아니다.
        save("rct_6", recruitmentDoc(6, "DRAFT", "2999-01-01T00:00:00Z", "2999-02-01T00:00:00Z"));

        mockMvc.perform(get("/api/v1/recruitments/current"))
                .andExpect(status().isOk())
                .andExpect(content().string("{\"success\":true,\"data\":{"
                        + "\"rid\":\"rct_5\",\"cohort\":5,\"title\":\"GDGoC DGU 5기 멤버 모집\",\"status\":\"OPEN\","
                        + "\"applyStartAt\":\"2000-01-01T00:00:00+09:00\",\"applyEndAt\":\"2999-12-31T23:59:59+09:00\","
                        + "\"tracks\":[\"BE\",\"FE\",\"AI\",\"Mobile\"],\"noticeMarkdown\":\"모집 안내 본문\","
                        + "\"applyState\":\"OPEN\",\"canApply\":true,\"formVersion\":3,\"posterUrl\":null}}"));
    }

    @Test
    void 공개된_회차가_없으면_404_NOT_FOUND다() throws Exception {
        save("rct_6", recruitmentDoc(6, "DRAFT", "2999-01-01T00:00:00Z", "2999-02-01T00:00:00Z"));

        mockMvc.perform(get("/api/v1/recruitments/current"))
                .andExpect(status().isNotFound())
                .andExpect(content().string(
                        "{\"success\":false,\"code\":\"NOT_FOUND\",\"message\":\"모집 정보가 없습니다.\"}"));
    }

    private void save(String rid, Map<String, Object> doc) {
        FirestoreFutures.await(firestore.collection(FirestoreRecruitmentRepository.COLLECTION).document(rid).set(doc));
    }

    private static Map<String, Object> recruitmentDoc(int cohort, String status, String startAt, String endAt) {
        Map<String, Object> doc = new HashMap<>();
        doc.put("cohort", cohort);
        doc.put("title", "GDGoC DGU " + cohort + "기 멤버 모집");
        doc.put("status", status);
        doc.put("closedManually", false);
        doc.put("applyStartAt", timestamp(startAt));
        doc.put("applyEndAt", timestamp(endAt));
        doc.put("tracks", List.of("BE", "FE", "AI", "Mobile"));
        doc.put("noticeMarkdown", "모집 안내 본문");
        doc.put("publishedFormVersion", 3);
        doc.put("posterFileId", null);
        return doc;
    }

    private static Timestamp timestamp(String iso) {
        Instant instant = Instant.parse(iso);
        return Timestamp.ofTimeSecondsAndNanos(instant.getEpochSecond(), instant.getNano());
    }
}
