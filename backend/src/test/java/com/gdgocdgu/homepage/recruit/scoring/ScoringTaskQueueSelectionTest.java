package com.gdgocdgu.homepage.recruit.scoring;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.google.cloud.tasks.v2.CloudTasksClient;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/**
 * 설정 값에 따라 {@link ScoringTaskQueue} 구현이 하나만 골라지는지, 설정이 비면 앱이 시작되지 않는지 확인한다.
 * 실제 Cloud Tasks 연결(인증 정보)이 필요 없도록 클라이언트는 목으로 대신한다.
 */
class ScoringTaskQueueSelectionTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withBean(ObjectMapper.class, () -> JsonMapper.builder().build())
            .withBean(CloudTasksClient.class, () -> mock(CloudTasksClient.class))
            .withUserConfiguration(ScoringTaskQueueConfig.class);

    private ApplicationContextRunner cloudTasksRunner() {
        return runner.withPropertyValues(
                "app.scoring.task-queue.mode=cloud-tasks",
                "app.scoring.task-queue.project-id=dev-gdgoc-dgu-homepage",
                "app.scoring.task-queue.location=asia-northeast3",
                "app.scoring.task-queue.queue=scoring",
                "app.scoring.task-queue.backend-url=https://backend-948542964993.asia-northeast3.run.app",
                "app.scoring.task-queue.invoker-service-account=tasks-invoker@dev-gdgoc-dgu-homepage.iam.gserviceaccount.com");
    }

    @Test
    void 설정이_없으면_로그_구현이_쓰인다() {
        runner.run(context -> {
            assertThat(context).hasSingleBean(ScoringTaskQueue.class);
            assertThat(context.getBean(ScoringTaskQueue.class)).isInstanceOf(LoggingScoringTaskQueue.class);
        });
    }

    @Test
    void mode가_logging이면_로그_구현이_쓰인다() {
        runner.withPropertyValues("app.scoring.task-queue.mode=logging").run(context -> {
            assertThat(context).hasSingleBean(ScoringTaskQueue.class);
            assertThat(context.getBean(ScoringTaskQueue.class)).isInstanceOf(LoggingScoringTaskQueue.class);
        });
    }

    @Test
    void mode가_cloud_tasks이고_값이_모두_있으면_Cloud_Tasks_구현이_쓰인다() {
        cloudTasksRunner().run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).hasSingleBean(ScoringTaskQueue.class);
            assertThat(context.getBean(ScoringTaskQueue.class)).isInstanceOf(CloudTasksScoringTaskQueue.class);
            assertThat(context.getBean(ScoringTaskQueueProperties.class).dispatchDeadline().toSeconds())
                    .isEqualTo(240);
        });
    }

    @Test
    void cloud_tasks인데_값이_비어_있으면_시작에_실패하고_빠진_설정을_알려준다() {
        cloudTasksRunner()
                .withPropertyValues("app.scoring.task-queue.queue= ", "app.scoring.task-queue.invoker-service-account=")
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure()).rootCause()
                            .hasMessageContaining("queue")
                            .hasMessageContaining("invoker-service-account")
                            .hasMessageNotContaining("project-id");
                });
    }

    @Test
    void cloud_tasks인데_설정이_하나도_없으면_시작에_실패한다() {
        runner.withPropertyValues("app.scoring.task-queue.mode=cloud-tasks")
                .run(context -> assertThat(context).hasFailed());
    }

    @Test
    void 알_수_없는_mode면_시작에_실패한다() {
        runner.withPropertyValues("app.scoring.task-queue.mode=sqs")
                .run(context -> assertThat(context).hasFailed());
    }
}
