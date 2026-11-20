package com.gdgocdgu.homepage.recruit.scoring;

import com.google.cloud.tasks.v2.CloudTasksClient;
import com.google.cloud.tasks.v2.CloudTasksSettings;
import java.io.IOException;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.ObjectMapper;

/**
 * {@code app.scoring.task-queue.mode}에 따라 {@link ScoringTaskQueue} 구현을 하나만 고른다.
 * <ul>
 *   <li>{@code logging}(기본, 값이 없을 때도): {@link LoggingScoringTaskQueue}. local에서 쓴다.</li>
 *   <li>{@code cloud-tasks}: {@link CloudTasksScoringTaskQueue}. dev · prod에서 쓴다.</li>
 * </ul>
 */
@Configuration
@EnableConfigurationProperties(ScoringTaskQueueProperties.class)
public class ScoringTaskQueueConfig {

    private static final Logger log = LoggerFactory.getLogger(ScoringTaskQueueConfig.class);

    /** 큐 등록(createTask) 한 번이 제출 요청을 붙잡아 두는 최대 시간 */
    static final Duration CREATE_TASK_TIMEOUT = Duration.ofSeconds(10);

    @Bean
    @ConditionalOnProperty(prefix = "app.scoring.task-queue", name = "mode", havingValue = "logging", matchIfMissing = true)
    ScoringTaskQueue loggingScoringTaskQueue() {
        return new LoggingScoringTaskQueue();
    }

    @Bean
    @ConditionalOnProperty(prefix = "app.scoring.task-queue", name = "mode", havingValue = "cloud-tasks")
    ScoringTaskQueue cloudTasksScoringTaskQueue(
            CloudTasksClient cloudTasksClient, ScoringTaskQueueProperties properties, ObjectMapper objectMapper) {
        log.info("채점 작업 큐: Cloud Tasks (project {}, location {}, queue {})",
                properties.projectId(), properties.location(), properties.queue());
        return new CloudTasksScoringTaskQueue(cloudTasksClient, properties, objectMapper);
    }

    /**
     * Cloud Tasks 클라이언트. cloud-tasks 모드에서만 만들고, 종료 시 Spring이 close()를 불러 연결을 정리한다.
     * 인증은 Application Default Credentials(Cloud Run에서는 backend-runtime 서비스 계정)로 하고 키 파일을 쓰지 않는다.
     */
    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = "app.scoring.task-queue", name = "mode", havingValue = "cloud-tasks")
    CloudTasksClient cloudTasksClient() throws IOException {
        return CloudTasksClient.create(cloudTasksSettings());
    }

    /**
     * createTask 호출 전체를 10초로 제한한다. Cloud Tasks가 느려도 지원서 제출(201)이 오래 막히지 않게 한다.
     * 재시도는 하지 않는다. 실패하면 로그만 남기고, PENDING에 멈춘 지원서는 API-RCT-031이 다시 넣는다.
     */
    static CloudTasksSettings cloudTasksSettings() throws IOException {
        CloudTasksSettings.Builder settings = CloudTasksSettings.newBuilder();
        settings.createTaskSettings().setRetrySettings(
                settings.createTaskSettings().getRetrySettings().toBuilder()
                        .setTotalTimeoutDuration(CREATE_TASK_TIMEOUT)
                        .setInitialRpcTimeoutDuration(CREATE_TASK_TIMEOUT)
                        .setMaxRpcTimeoutDuration(CREATE_TASK_TIMEOUT)
                        .setMaxAttempts(1)
                        .build());
        return settings.build();
    }
}
