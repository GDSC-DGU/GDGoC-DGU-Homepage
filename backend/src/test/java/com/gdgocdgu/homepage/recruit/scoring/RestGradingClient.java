package com.gdgocdgu.homepage.recruit.scoring;

import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

/**
 * AI 서버 {@code POST /grading} 호출 ({@link RestClient}).
 *
 * <p>상태 분류
 * <ul>
 *   <li>200: 성공. 응답 형식이 맞지 않으면 일시 실패({@code AI_OUTPUT_INVALID}).</li>
 *   <li>422와 그 밖의 4xx: 같은 입력으로 다시 해도 같으므로 영구 실패({@code AI_VALIDATION_FAILED}).
 *       단 401 · 403(호출 권한 설정 문제), 408 · 429는 설정을 고치거나 기다리면 되므로 일시 실패.</li>
 *   <li>500 · 502 · 503 등 5xx, 시간 초과, 연결 오류, 인증 토큰 발급 실패: 일시 실패.</li>
 * </ul>
 * 로그에는 상태 코드와 예외 종류만 남긴다. 요청 · 응답 본문과 토큰은 남기지 않는다.
 */
class RestGradingClient implements GradingClient {

    private static final Logger log = LoggerFactory.getLogger(RestGradingClient.class);

    static final String ERROR_AI_VALIDATION_FAILED = "AI_VALIDATION_FAILED";
    static final String ERROR_AI_UNAVAILABLE = "AI_UNAVAILABLE";
    static final String ERROR_AI_OUTPUT_INVALID = "AI_OUTPUT_INVALID";
    static final String ERROR_AI_AUTH_FAILED = "AI_AUTH_FAILED";

    private final RestClient restClient;
    private final IdTokenSupplier tokenSupplier;
    private final ObjectMapper objectMapper;

    /** @param tokenSupplier 인증 헤더에 넣을 ID 토큰 공급자. 인증하지 않으면 null */
    RestGradingClient(RestClient restClient, IdTokenSupplier tokenSupplier, ObjectMapper objectMapper) {
        this.restClient = restClient;
        this.tokenSupplier = tokenSupplier;
        this.objectMapper = objectMapper;
    }

    @Override
    public GradingOutcome grade(GradingRequest request) {
        String token = null;
        if (tokenSupplier != null) {
            try {
                token = tokenSupplier.get();
            } catch (IOException | RuntimeException e) {
                log.warn("AI 인증 토큰 발급 실패: error={}", e.getClass().getSimpleName());
                return new Transient(ERROR_AI_AUTH_FAILED);
            }
        }

        try {
            String body = objectMapper.writeValueAsString(request);
            String bearer = token;
            return restClient.post()
                    .uri("/grading")
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(headers -> {
                        if (bearer != null) {
                            headers.set(HttpHeaders.AUTHORIZATION, "Bearer " + bearer);
                        }
                    })
                    .body(body)
                    .exchange((req, res) -> {
                        int status = res.getStatusCode().value();
                        if (status == 200) {
                            return parse(res.getBody());
                        }
                        GradingOutcome outcome = classify(status);
                        log.warn("AI 채점 호출 실패: status={}, outcome={}", status, outcome.getClass().getSimpleName());
                        return outcome;
                    });
        } catch (Exception e) {
            // 시간 초과 · 연결 오류 등. 메시지에 주소나 내용이 섞일 수 있어 예외 종류만 남긴다.
            log.warn("AI 채점 호출 오류: error={}", e.getClass().getSimpleName());
            return new Transient(ERROR_AI_UNAVAILABLE);
        }
    }

    private GradingOutcome parse(java.io.InputStream body) {
        try {
            GradingResponse response = objectMapper.readValue(body, GradingResponse.class);
            return new Success(response);
        } catch (RuntimeException e) {
            log.warn("AI 채점 응답 해석 실패: error={}", e.getClass().getSimpleName());
            return new Transient(ERROR_AI_OUTPUT_INVALID);
        }
    }

    static GradingOutcome classify(int status) {
        if (status == 401 || status == 403 || status == 408 || status == 429) {
            return new Transient(status == 408 || status == 429 ? ERROR_AI_UNAVAILABLE : ERROR_AI_AUTH_FAILED);
        }
        if (status >= 400 && status < 500) {
            return new Permanent(ERROR_AI_VALIDATION_FAILED);
        }
        return new Transient(ERROR_AI_UNAVAILABLE);
    }
}
