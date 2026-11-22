package com.gdgocdgu.homepage.recruit.scoring;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.gdgocdgu.homepage.common.error.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** local 프로필에서는 /internal 인증이 꺼져 있으므로 인증 없이 컨트롤러 계약만 확인한다. */
@SpringBootTest
@AutoConfigureMockMvc
class ScoringControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    ScoringService scoringService;

    @Test
    void 성공하면_200과_aid_scoringStatus를_data에_담는다() throws Exception {
        when(scoringService.score("a_test", 2)).thenReturn(ScoringStatus.DONE);

        mockMvc.perform(post("/internal/scoring").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"aid\":\"a_test\",\"criteriaVersion\":2}"))
                .andExpect(status().isOk())
                .andExpect(content().string("{\"success\":true,\"data\":{\"aid\":\"a_test\",\"scoringStatus\":\"DONE\"}}"));
    }

    @Test
    void SKIPPED_STALE도_200이다() throws Exception {
        when(scoringService.score("a_test", 1)).thenReturn(ScoringStatus.SKIPPED_STALE);

        mockMvc.perform(post("/internal/scoring").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"aid\":\"a_test\",\"criteriaVersion\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scoringStatus").value("SKIPPED_STALE"));
    }

    @Test
    void 일시_실패면_503과_SCORING_RETRY_본문이다() throws Exception {
        when(scoringService.score("a_test", 1)).thenThrow(new ApiException(RecruitScoringErrorCode.SCORING_RETRY));

        mockMvc.perform(post("/internal/scoring").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"aid\":\"a_test\",\"criteriaVersion\":1}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(content().string(
                        "{\"success\":false,\"code\":\"SCORING_RETRY\",\"message\":\"채점을 다시 시도합니다.\"}"));
    }

    @Test
    void 입력이_잘못되면_400_VALIDATION_FAILED이고_서비스를_부르지_않는다() throws Exception {
        for (String body : new String[] {
                "{}", "{\"aid\":\"\",\"criteriaVersion\":1}", "{\"aid\":\"  \",\"criteriaVersion\":1}",
                "{\"aid\":\"a_test\"}", "{\"aid\":\"a_test\",\"criteriaVersion\":0}",
                "{\"aid\":\"a_test\",\"criteriaVersion\":\"x\"}", "{\"aid\":\"a/b\",\"criteriaVersion\":1}", "not json"}) {
            mockMvc.perform(post("/internal/scoring").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        }
        verify(scoringService, never()).score(anyString(), anyInt());
    }
}
