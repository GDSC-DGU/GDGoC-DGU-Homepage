package com.gdgocdgu.homepage.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

// Google 클라이언트 ID가 없는 상태로 테스트한다.
@SpringBootTest(properties = "GOOGLE_CLIENT_ID=")
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Test
    void 토큰이_누락되면_400을_반환한다() throws Exception {
        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void Google_설정이_없어도_토큰으로_읽을_수_없는_문자열은_401을_반환한다() throws Exception {
        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"abc\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("INVALID_GOOGLE_TOKEN"));
    }

    @Test
    void 발급_대상을_숫자로_보낸_토큰이면_401을_반환한다() throws Exception {
        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tokenRequestWithAudience("123")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_GOOGLE_TOKEN"));
    }

    @Test
    void 실제_검증에_필요한_설정이_없으면_500을_반환한다() throws Exception {
        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tokenRequestWithAudience("\"test-client.apps.googleusercontent.com\"")))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"));
    }

    // 발급 대상(aud)을 바꿔 넣을 수 있는 가짜 토큰을 만든다.
    private static String tokenRequestWithAudience(String audienceJson) {
        long now = Instant.now().getEpochSecond();
        String payload = """
                {"iss":"https://accounts.google.com","aud":%s,"iat":%d,"exp":%d}
                """.formatted(audienceJson, now - 10, now + 300);
        Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
        String header = encoder.encodeToString("{\"alg\":\"RS256\"}".getBytes(StandardCharsets.UTF_8));
        String token = header + "." + encoder.encodeToString(payload.getBytes(StandardCharsets.UTF_8)) + ".YQ";
        return "{\"idToken\":\"" + token + "\"}";
    }
}
