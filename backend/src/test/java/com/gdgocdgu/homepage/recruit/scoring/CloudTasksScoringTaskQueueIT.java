package com.gdgocdgu.homepage.recruit.scoring;

import static org.assertj.core.api.Assertions.assertThat;

import com.google.cloud.tasks.v2.CloudTasksClient;
import com.google.cloud.tasks.v2.Task;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import tools.jackson.databind.json.JsonMapper;

/**
 * 실제 dev 큐(dev-gdgoc-dgu-homepage / asia-northeast3 / scoring)에 작업을 1건 만드는 수동 테스트.
 * 기본으로는 건너뛴다. 내 PC의 Application Default Credentials(gcloud auth application-default login)가 필요하다.
 *
 * <pre>SCORING_TASKS_IT=true ./gradlew test --tests '*CloudTasksScoringTaskQueueIT' --rerun-tasks</pre>
 *
 * 만든 작업은 지우지 않는다. dev에는 backend가 아직 없을 수 있어 전달은 실패하고 큐가 재시도한다. 확인 뒤 큐를 비운다.
 * CI에는 인증 정보가 없으므로 이 테스트를 켜지 않는다.
 */
@EnabledIfEnvironmentVariable(named = "SCORING_TASKS_IT", matches = "true")
class CloudTasksScoringTaskQueueIT {

    @Test
    void 실제_dev_큐에_작업을_만들면_작업_이름이_돌아온다() throws Exception {
        ScoringTaskQueueProperties properties = new ScoringTaskQueueProperties(
                ScoringTaskQueueProperties.Mode.CLOUD_TASKS, "dev-gdgoc-dgu-homepage", "asia-northeast3", "scoring",
                "https://backend-948542964993.asia-northeast3.run.app",
                "tasks-invoker@dev-gdgoc-dgu-homepage.iam.gserviceaccount.com", Duration.ofSeconds(240));
        String aid = "a_it_" + System.currentTimeMillis();

        try (CloudTasksClient client = CloudTasksClient.create(ScoringTaskQueueConfig.cloudTasksSettings())) {
            Task created = new CloudTasksScoringTaskQueue(client, properties, JsonMapper.builder().build())
                    .createTask(aid, 1);

            System.out.println("CREATED_TASK aid=" + aid + " name=" + created.getName());
            assertThat(created.getName()).startsWith(
                    "projects/dev-gdgoc-dgu-homepage/locations/asia-northeast3/queues/scoring/tasks/");
        }
    }
}
