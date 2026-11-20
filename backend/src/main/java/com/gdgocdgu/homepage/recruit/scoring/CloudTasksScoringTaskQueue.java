package com.gdgocdgu.homepage.recruit.scoring;

import com.google.api.gax.rpc.StatusCode;
import com.google.cloud.tasks.v2.CloudTasksClient;
import com.google.cloud.tasks.v2.HttpMethod;
import com.google.cloud.tasks.v2.HttpRequest;
import com.google.cloud.tasks.v2.OidcToken;
import com.google.cloud.tasks.v2.QueueName;
import com.google.cloud.tasks.v2.Task;
import com.google.protobuf.ByteString;
import com.google.protobuf.Duration;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.ObjectMapper;

/**
 * 채점 작업을 Cloud Tasks 큐({@code scoring})에 등록하는 구현. dev · prod에서 쓴다.
 *
 * <p>등록한 작업은 큐가 {@code POST {backend-url}/internal/scoring}으로 전달한다(API-RCT-028).
 * 본문은 {@code {"aid":"...","criteriaVersion":N}}이고, 서비스 계정(tasks-invoker) OIDC 토큰을 달아 보낸다.
 * 토큰의 audience는 backend 주소다.
 *
 * <p>작업 이름(name)은 정하지 않는다. 이름을 붙인 작업은 실행이 끝난 뒤에도 한동안 같은 이름으로 다시 만들 수 없어
 * 재채점을 막는다. 같은 지원서가 두 번 전달돼도 채점 쪽이 상태 선점으로 한 번만 처리한다.
 *
 * <p>로그에는 {@code aid}, {@code criteriaVersion}, 예외 종류, gRPC 상태 코드만 남긴다.
 */
public class CloudTasksScoringTaskQueue implements ScoringTaskQueue {

    private static final Logger log = LoggerFactory.getLogger(CloudTasksScoringTaskQueue.class);

    private static final String INTERNAL_SCORING_PATH = "/internal/scoring";

    private final CloudTasksClient client;
    private final ScoringTaskQueueProperties properties;
    private final ObjectMapper objectMapper;

    public CloudTasksScoringTaskQueue(
            CloudTasksClient client, ScoringTaskQueueProperties properties, ObjectMapper objectMapper) {
        this.client = client;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    public void enqueue(String aid, int criteriaVersion) {
        if (aid == null || aid.isBlank() || criteriaVersion < 1) {
            // 잘못된 입력이어도 예외를 던지지 않는다. 멈춘 지원서는 RCT-031이 다시 넣는다.
            log.warn("채점 작업 등록 건너뜀: 잘못된 입력 (aid={}, criteriaVersion={})", aid, criteriaVersion);
            return;
        }
        try {
            Task created = createTask(aid, criteriaVersion);
            log.info("채점 작업 등록: aid={}, criteriaVersion={}, task={}", aid, criteriaVersion, created.getName());
        } catch (Exception e) {
            // 등록 실패는 호출한 쪽에 전파하지 않는다. 메시지에는 요청 내용이 섞일 수 있어 종류와 상태 코드만 남긴다.
            log.warn("채점 작업 등록 실패: aid={}, criteriaVersion={}, error={}, grpcStatus={}",
                    aid, criteriaVersion, e.getClass().getSimpleName(), grpcStatus(e));
        }
    }

    /**
     * 큐에 작업을 만들고 Cloud Tasks가 돌려준 작업을 반환한다. 실패하면 예외를 그대로 던진다.
     * {@link #enqueue}가 예외를 삼키므로, 실제 큐 연결을 확인하는 수동 테스트가 결과를 보려고 쓴다.
     */
    Task createTask(String aid, int criteriaVersion) {
        String baseUrl = stripTrailingSlash(properties.backendUrl());
        HttpRequest httpRequest = HttpRequest.newBuilder()
                .setUrl(baseUrl + INTERNAL_SCORING_PATH)
                .setHttpMethod(HttpMethod.POST)
                .putHeaders("Content-Type", "application/json")
                .setBody(ByteString.copyFrom(toJson(aid, criteriaVersion), StandardCharsets.UTF_8))
                .setOidcToken(OidcToken.newBuilder()
                        .setServiceAccountEmail(properties.invokerServiceAccount())
                        .setAudience(baseUrl)
                        .build())
                .build();

        Task task = Task.newBuilder()
                .setHttpRequest(httpRequest)
                .setDispatchDeadline(Duration.newBuilder()
                        .setSeconds(properties.dispatchDeadline().toSeconds())
                        .build())
                .build();

        String parent = QueueName.of(properties.projectId(), properties.location(), properties.queue()).toString();
        return client.createTask(parent, task);
    }

    private String toJson(String aid, int criteriaVersion) {
        return objectMapper.writeValueAsString(new Payload(aid, criteriaVersion));
    }

    private static String stripTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private static String grpcStatus(Throwable e) {
        if (e instanceof com.google.api.gax.rpc.ApiException apiException) {
            StatusCode.Code code = apiException.getStatusCode().getCode();
            return code.name();
        }
        return "-";
    }

    /** API-RCT-028 요청 본문 */
    private record Payload(String aid, int criteriaVersion) {
    }
}
