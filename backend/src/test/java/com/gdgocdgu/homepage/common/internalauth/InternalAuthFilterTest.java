package com.gdgocdgu.homepage.common.internalauth;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.FilterChain;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import tools.jackson.databind.json.JsonMapper;

class InternalAuthFilterTest {

    private static final String VALID = "valid-token";

    private final List<String> verified = new ArrayList<>();
    private final InternalTokenVerifier verifier = token -> {
        verified.add(token);
        return VALID.equals(token);
    };
    private int chainCalls;
    private final FilterChain chain = (req, res) -> chainCalls++;

    private InternalAuthFilter filter(boolean disabled) {
        return new InternalAuthFilter(verifier, disabled, JsonMapper.builder().build());
    }

    private MockHttpServletResponse run(InternalAuthFilter filter, String path, String authorization) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        if (authorization != null) {
            request.addHeader("Authorization", authorization);
        }
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        return response;
    }

    @Test
    void 헤더가_없으면_401과_표준_오류_본문이다() throws Exception {
        MockHttpServletResponse response = run(filter(false), "/internal/scoring", null);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentType()).startsWith("application/json");
        assertThat(response.getContentAsString()).isEqualTo(
                "{\"success\":false,\"code\":\"AUTH_REQUIRED\",\"message\":\"로그인이 필요합니다.\"}");
        assertThat(chainCalls).isZero();
        assertThat(verified).isEmpty();
    }

    @Test
    void Bearer가_아니거나_토큰이_틀리면_401이다() throws Exception {
        assertThat(run(filter(false), "/internal/scoring", "Basic abc").getStatus()).isEqualTo(401);
        assertThat(run(filter(false), "/internal/scoring", "Bearer ").getStatus()).isEqualTo(401);
        assertThat(run(filter(false), "/internal/scoring", "Bearer bad-token").getStatus()).isEqualTo(401);
        assertThat(chainCalls).isZero();
    }

    @Test
    void 올바른_토큰이면_다음으로_넘긴다() throws Exception {
        MockHttpServletResponse response = run(filter(false), "/internal/scoring", "Bearer " + VALID);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chainCalls).isEqualTo(1);
    }

    @Test
    void 내부_경로가_아니면_검사하지_않는다() throws Exception {
        assertThat(run(filter(false), "/api/v1/health", null).getStatus()).isEqualTo(200);
        assertThat(run(filter(false), "/internalfoo", null).getStatus()).isEqualTo(200);
        assertThat(chainCalls).isEqualTo(2);
        assertThat(verified).isEmpty();
    }

    @Test
    void disabled_모드는_내부_경로도_통과시킨다() throws Exception {
        assertThat(run(filter(true), "/internal/scoring", null).getStatus()).isEqualTo(200);
        assertThat(chainCalls).isEqualTo(1);
    }
}
