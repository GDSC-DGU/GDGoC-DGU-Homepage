package com.gdgocdgu.homepage.recruit.scoring;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.gdgocdgu.homepage.common.internalauth.InternalTokenVerifier;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/**
 * 실제 내장 서버(Tomcat)로 /internal 인증 우회를 확인한다. MockMvc는 컨테이너의 경로 처리를 재현하지 못한다.
 * 클라이언트가 경로를 정규화하지 않도록 소켓에 요청 줄을 그대로 쓴다.
 * 요구사항은 "유효한 토큰 없이는 어떤 경로 변형도 컨트롤러(서비스)에 도달하지 않는다"이다.
 * Tomcat이 필터 앞에서 400/404로 거절하는 변형도 이 요구사항을 만족하므로 통과로 본다.
 * ScoringService가 패키지 비공개라서 이 테스트는 같은 패키지에 둔다.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "app.internal-auth.mode=oidc",
            "app.internal-auth.audience=https://backend.example.test",
            "app.internal-auth.allowed-service-accounts[0]=tasks-invoker@example.iam.gserviceaccount.com"
        })
class InternalAuthEmbeddedServerTest {

    private static final String FAKE_TOKEN = "fake-valid-token";
    private static final String BODY = "{\"aid\":\"a_test\",\"criteriaVersion\":1}";

    @LocalServerPort
    int port;

    /** 고정된 가짜 토큰만 허용한다(Google 공개키 조회 없음). */
    @MockitoBean
    InternalTokenVerifier verifier;

    @MockitoBean
    ScoringService scoringService;

    @BeforeEach
    void 준비() {
        reset(scoringService, verifier);
        when(verifier.verify(anyString())).thenAnswer(inv -> FAKE_TOKEN.equals(inv.getArgument(0)));
        when(scoringService.score("a_test", 1)).thenReturn(ScoringStatus.DONE);
    }

    record Raw(int status, String body) {
    }

    private Raw send(String method, String path, String token, String body) throws Exception {
        try (Socket socket = new Socket("127.0.0.1", port)) {
            byte[] payload = body == null ? new byte[0] : body.getBytes(StandardCharsets.UTF_8);
            StringBuilder sb = new StringBuilder();
            sb.append(method).append(' ').append(path).append(" HTTP/1.1\r\n")
                    .append("Host: 127.0.0.1:").append(port).append("\r\n")
                    .append("Connection: close\r\n");
            if (token != null) {
                sb.append("Authorization: Bearer ").append(token).append("\r\n");
            }
            if (body != null) {
                sb.append("Content-Type: application/json\r\n");
            }
            sb.append("Content-Length: ").append(payload.length).append("\r\n\r\n");
            socket.getOutputStream().write(sb.toString().getBytes(StandardCharsets.UTF_8));
            socket.getOutputStream().write(payload);
            socket.getOutputStream().flush();
            String response = new String(socket.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            int status = Integer.parseInt(response.substring(9, 12));
            int split = response.indexOf("\r\n\r\n");
            return new Raw(status, split < 0 ? "" : response.substring(split + 4));
        }
    }

    @Test
    void 토큰_없이는_어떤_경로_변형도_컨트롤러에_도달하지_못한다() throws Exception {
        Map<String, Integer> results = new LinkedHashMap<>();
        for (String path : new String[] {"/internal/scoring", "/%69nternal/scoring", "/internal;x=1/scoring",
                "/internal/./scoring", "//internal/scoring", "/foo/../internal/scoring", "/INTERNAL/scoring"}) {
            Raw raw = send("POST", path, null, BODY);
            results.put(path, raw.status());
            assertThat(raw.status()).as(path).isNotEqualTo(200);
            if (raw.status() == 401) {
                assertThat(raw.body()).as(path).contains("\"success\":false").contains("\"code\":\"AUTH_REQUIRED\"");
            }
        }
        System.out.println("[raw-path-results] " + results);
        verify(scoringService, never()).score(anyString(), anyInt());
    }

    @Test
    void 정규_경로와_컨테이너가_정규화하는_변형은_401_JSON이다() throws Exception {
        for (String path : new String[] {"/internal/scoring", "/%69nternal/scoring", "/internal;x=1/scoring"}) {
            Raw raw = send("POST", path, null, BODY);
            assertThat(raw.status()).as(path).isEqualTo(401);
            assertThat(raw.body()).as(path).contains("\"success\":false").contains("\"code\":\"AUTH_REQUIRED\"");
        }
        verify(scoringService, never()).score(anyString(), anyInt());
    }

    @Test
    void 틀린_토큰은_401이고_올바른_토큰은_필터를_통과해_서비스에_도달한다() throws Exception {
        assertThat(send("POST", "/internal/scoring", "wrong", BODY).status()).isEqualTo(401);
        verify(scoringService, never()).score(anyString(), anyInt());

        Raw ok = send("POST", "/internal/scoring", FAKE_TOKEN, BODY);
        assertThat(ok.status()).isEqualTo(200);
        verify(scoringService).score("a_test", 1);
    }

    @Test
    void 토큰이_있어도_변형_경로는_정상_경로와_같이_처리된다() throws Exception {
        Raw raw = send("POST", "/%69nternal/scoring", FAKE_TOKEN, BODY);
        assertThat(raw.status()).isEqualTo(200);
        verify(scoringService).score("a_test", 1);
    }

    @Test
    void 내부_경로가_아니면_토큰_없이_200이다() throws Exception {
        assertThat(send("GET", "/api/v1/health", null, null).status()).isEqualTo(200);
    }
}
