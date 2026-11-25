package com.gdgocdgu.homepage.recruit.scoring;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** local 프로필에서는 /internal 인증이 꺼져 있으므로 인증 없이 컨트롤러 계약만 확인한다. */
@SpringBootTest
@AutoConfigureMockMvc
class ScoringRecoveryControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    ScoringRecoveryService recoveryService;

    @Test
    void 성공하면_200과_requeued를_data에_담는다() throws Exception {
        when(recoveryService.recover()).thenReturn(2);

        mockMvc.perform(post("/internal/jobs/scoring-recovery"))
                .andExpect(status().isOk())
                .andExpect(content().string("{\"success\":true,\"data\":{\"requeued\":2}}"));
    }
}
