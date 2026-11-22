package com.gdgocdgu.homepage.recruit.scoring;

import static org.assertj.core.api.Assertions.assertThat;

import com.gdgocdgu.homepage.recruit.scoring.GradingClient.GradingOutcome;
import com.gdgocdgu.homepage.recruit.scoring.GradingClient.GradingRequest;
import com.gdgocdgu.homepage.recruit.scoring.GradingClient.Permanent;
import com.gdgocdgu.homepage.recruit.scoring.GradingClient.Success;
import com.gdgocdgu.homepage.recruit.scoring.GradingClient.Transient;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/** JDK 내장 HTTP 서버를 가짜 AI 서버로 써서 상태 코드별 분류와 요청 모양을 확인한다. */
class RestGradingClientTest {

    private static final GradingRequest REQUEST = new GradingRequest("a_test",
            List.of(new GradingRequest.Item("i1", "n1", List.of("q1"), "g1")),
            List.of(new GradingRequest.Answer("q1", "제목", "답")));

    private final ObjectMapper objectMapper = JsonMapper.builder().build();
    private HttpServer server;
    private volatile int status;
    private volatile String responseBody;
    private volatile long delayMillis;
    private final AtomicReference<String> receivedPath = new AtomicReference<>();
    private final AtomicReference<String> receivedAuth = new AtomicReference<>();
    private final AtomicReference<String> receivedBody = new AtomicReference<>();

    @BeforeEach
    void 서버_시작() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            receivedPath.set(exchange.getRequestURI().getPath());
            receivedAuth.set(exchange.getRequestHeaders().getFirst("Authorization"));
            receivedBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            try {
                Thread.sleep(delayMillis);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            byte[] bytes = (responseBody == null ? "" : responseBody).getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, bytes.length == 0 ? -1 : bytes.length);
            if (bytes.length > 0) {
                exchange.getResponseBody().write(bytes);
            }
            exchange.close();
        });
        server.start();
    }

    @AfterEach
    void 서버_종료() {
        server.stop(0);
    }

    private RestGradingClient client(IdTokenSupplier supplier, Duration readTimeout) {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(2)).build());
        factory.setReadTimeout(readTimeout);
        RestClient restClient = RestClient.builder()
                .baseUrl("http://127.0.0.1:" + server.getAddress().getPort()).requestFactory(factory).build();
        return new RestGradingClient(restClient, supplier, objectMapper);
    }

    @Test
    void 성공_응답을_해석하고_요청은_grading_경로로_camelCase_JSON을_보낸다() {
        status = 200;
        responseBody = "{\"success\":true,\"applicationId\":\"a_test\",\"results\":[{\"itemId\":\"i1\",\"level\":4,"
                + "\"reason\":\"r\"}],\"instructionIgnored\":false,\"model\":\"m\",\"promptVersion\":\"p1\",\"extra\":1}";

        GradingOutcome outcome = client(null, Duration.ofSeconds(5)).grade(REQUEST);

        assertThat(outcome).isInstanceOf(Success.class);
        assertThat(((Success) outcome).response().results().getFirst().level()).isEqualTo(4);
        assertThat(((Success) outcome).response().promptVersion()).isEqualTo("p1");
        assertThat(receivedPath.get()).isEqualTo("/grading");
        assertThat(receivedBody.get()).contains("\"applicationId\":\"a_test\"", "\"questionIds\":[\"q1\"]");
        assertThat(receivedAuth.get()).isNull();
    }

    @Test
    void 토큰_공급자가_있으면_Bearer_헤더를_붙인다() {
        status = 200;
        responseBody = "{\"success\":true,\"applicationId\":\"a_test\",\"results\":[],\"instructionIgnored\":false,"
                + "\"model\":\"m\",\"promptVersion\":\"p\"}";

        client(() -> "fake-token", Duration.ofSeconds(5)).grade(REQUEST);

        assertThat(receivedAuth.get()).isEqualTo("Bearer fake-token");
    }

    @Test
    void 토큰_발급에_실패하면_일시_실패이고_AI를_부르지_않는다() {
        GradingOutcome outcome = client(() -> {
            throw new IOException("no credentials");
        }, Duration.ofSeconds(5)).grade(REQUEST);

        assertThat(outcome).isEqualTo(new Transient("AI_AUTH_FAILED"));
        assertThat(receivedPath.get()).isNull();
    }

    @Test
    void AI_422와_일반_4xx는_영구_실패다() {
        for (int code : new int[] {422, 400, 404}) {
            status = code;
            assertThat(client(null, Duration.ofSeconds(5)).grade(REQUEST))
                    .isEqualTo(new Permanent("AI_VALIDATION_FAILED"));
        }
    }

    @Test
    void AI_500_502_503과_권한_429는_일시_실패다() {
        for (int code : new int[] {500, 502, 503, 401, 403, 429}) {
            status = code;
            assertThat(client(null, Duration.ofSeconds(5)).grade(REQUEST)).isInstanceOf(Transient.class);
        }
    }

    @Test
    void 응답_형식이_맞지_않으면_일시_실패다() {
        status = 200;
        responseBody = "not json";

        assertThat(client(null, Duration.ofSeconds(5)).grade(REQUEST)).isEqualTo(new Transient("AI_OUTPUT_INVALID"));
    }

    @Test
    void 읽기_시간이_초과되면_일시_실패다() {
        status = 200;
        responseBody = "{}";
        delayMillis = 1500;

        assertThat(client(null, Duration.ofMillis(300)).grade(REQUEST)).isEqualTo(new Transient("AI_UNAVAILABLE"));
    }

    @Test
    void 연결할_수_없으면_일시_실패다() {
        RestGradingClient client = client(null, Duration.ofSeconds(1));
        server.stop(0);

        assertThat(client.grade(REQUEST)).isEqualTo(new Transient("AI_UNAVAILABLE"));
    }
}
