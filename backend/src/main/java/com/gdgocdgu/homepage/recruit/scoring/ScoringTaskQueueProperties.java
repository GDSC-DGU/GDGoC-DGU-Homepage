package com.gdgocdgu.homepage.recruit.scoring;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * 채점 작업 큐 설정 (application-{profile}.yml 의 app.scoring.task-queue).
 * 값은 모두 비밀이 아니다(프로젝트 ID · 서비스 계정 이메일 · URL). 인증은 Application Default Credentials로 한다.
 *
 * <p>{@code mode}가 {@code cloud-tasks}인데 아래 값 중 비어 있는 것이 있으면 앱이 시작되지 않는다.
 * 큐에 못 넣는 줄 모르고 운영하는 일을 막기 위해서다. {@code logging}이면 나머지 값은 쓰지 않는다.
 *
 * @param mode                  {@code logging}(기본, 로그만 남김) 또는 {@code cloud-tasks}(실제 큐에 등록)
 * @param projectId             큐가 있는 GCP 프로젝트 ID
 * @param location              큐의 리전 (예: asia-northeast3)
 * @param queue                 큐 이름 (예: scoring)
 * @param backendUrl            채점 요청을 받을 backend 주소. 요청 URL의 기준이자 OIDC 토큰의 audience (끝의 / 는 없어도 됨)
 * @param invokerServiceAccount OIDC 토큰을 발급받을 서비스 계정 이메일 (tasks-invoker)
 * @param dispatchDeadline      Cloud Tasks가 backend 응답을 기다리는 최대 시간. 기본 240초
 */
@ConfigurationProperties("app.scoring.task-queue")
public record ScoringTaskQueueProperties(
        @DefaultValue("logging") Mode mode,
        String projectId,
        String location,
        String queue,
        String backendUrl,
        String invokerServiceAccount,
        @DefaultValue("240s") Duration dispatchDeadline) {

    public enum Mode {
        LOGGING,
        CLOUD_TASKS
    }

    public ScoringTaskQueueProperties {
        if (mode == Mode.CLOUD_TASKS) {
            List<String> missing = new ArrayList<>();
            if (isBlank(projectId)) missing.add("project-id");
            if (isBlank(location)) missing.add("location");
            if (isBlank(queue)) missing.add("queue");
            if (isBlank(backendUrl)) missing.add("backend-url");
            if (isBlank(invokerServiceAccount)) missing.add("invoker-service-account");
            if (!missing.isEmpty()) {
                throw new IllegalStateException(
                        "app.scoring.task-queue.mode=cloud-tasks 인데 필수 설정이 비어 있습니다: " + String.join(", ", missing));
            }
            if (dispatchDeadline == null || dispatchDeadline.isZero() || dispatchDeadline.isNegative()) {
                throw new IllegalStateException("app.scoring.task-queue.dispatch-deadline 은 0보다 커야 합니다.");
            }
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
