package com.gdgocdgu.homepage.health;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class HealthControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Test
    void health는_success_true와_data_안의_status_UP을_반환한다() throws Exception {
        // success, data 두 필드뿐이고 이 순서인지 문자열 그대로 비교한다.
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(content().string("{\"success\":true,\"data\":{\"status\":\"UP\"}}"));
    }
}
