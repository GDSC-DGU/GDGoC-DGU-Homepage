package com.gdgocdgu.homepage.common.error;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
class GlobalExceptionHandlerTest {

    @Autowired
    MockMvc mockMvc;

    // 필드가 success, code, message 3개뿐이고 이 순서인지 문자열 그대로 비교한다.
    private static void expectError(ResultActions result, int status, String code, String message) throws Exception {
        result.andExpect(status().is(status))
                .andExpect(content().string(
                        "{\"success\":false,\"code\":\"" + code + "\",\"message\":\"" + message + "\"}"));
    }

    @Test
    void ApiException은_코드의_상태와_기본_메시지로_바뀐다() throws Exception {
        expectError(mockMvc.perform(get("/test-support/errors/api")), 403, "FORBIDDEN", "권한이 없습니다.");
    }

    @Test
    void ApiException에_메시지를_주면_그_메시지를_쓴다() throws Exception {
        expectError(mockMvc.perform(get("/test-support/errors/api-message")),
                404, "NOT_FOUND", "모집 공고를 찾을 수 없습니다.");
    }

    @Test
    void Valid_실패는_400이다() throws Exception {
        expectError(mockMvc.perform(post("/test-support/errors/valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}")),
                400, "VALIDATION_FAILED", "요청 형식이 올바르지 않습니다.");
    }

    @Test
    void 읽을_수_없는_JSON은_400이다() throws Exception {
        expectError(mockMvc.perform(post("/test-support/errors/valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{깨진 json")),
                400, "VALIDATION_FAILED", "요청 형식이 올바르지 않습니다.");
    }

    @Test
    void 필수_파라미터_누락은_400이다() throws Exception {
        expectError(mockMvc.perform(get("/test-support/errors/param")),
                400, "VALIDATION_FAILED", "요청 형식이 올바르지 않습니다.");
    }

    @Test
    void 타입_불일치는_400이고_입력값이_응답에_섞이지_않는다() throws Exception {
        expectError(mockMvc.perform(get("/test-support/errors/param").param("page", "비밀값")),
                400, "VALIDATION_FAILED", "요청 형식이 올바르지 않습니다.");
    }

    @Test
    void 예상_못_한_예외는_500_고정_문구이고_내부_메시지를_싣지_않는다() throws Exception {
        expectError(mockMvc.perform(get("/test-support/errors/boom")),
                500, "INTERNAL_ERROR", "서버 오류가 발생했습니다.");
    }

    @Test
    void 없는_주소는_404이다() throws Exception {
        expectError(mockMvc.perform(get("/api/v1/nope")),
                404, "NOT_FOUND", "요청한 대상을 찾을 수 없습니다.");
    }

    @Test
    void 지원하지_않는_메서드는_405이다() throws Exception {
        expectError(mockMvc.perform(post("/api/v1/health")),
                405, "METHOD_NOT_ALLOWED", "지원하지 않는 요청 방식입니다.");
    }
}
