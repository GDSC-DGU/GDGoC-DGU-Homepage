package com.gdgocdgu.homepage.recruit.scoring;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.google.api.gax.grpc.GrpcStatusCode;
import com.google.api.gax.rpc.ApiException;
import com.google.api.gax.rpc.StatusCode;
import com.google.cloud.tasks.v2.CloudTasksClient;
import com.google.cloud.tasks.v2.HttpMethod;
import com.google.cloud.tasks.v2.Task;
import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(OutputCaptureExtension.class)
class CloudTasksScoringTaskQueueTest {

    private static final String PARENT = "projects/dev-gdgoc-dgu-homepage/locations/asia-northeast3/queues/scoring";
    private static final String BACKEND_URL = "https://backend-948542964993.asia-northeast3.run.app";
    private static final String INVOKER = "tasks-invoker@dev-gdgoc-dgu-homepage.iam.gserviceaccount.com";

    private CloudTasksClient client;
    private CloudTasksScoringTaskQueue queue;

    @BeforeEach
    void setUp() {
        client = mock(CloudTasksClient.class);
        queue = queueWith(BACKEND_URL);
    }

    private CloudTasksScoringTaskQueue queueWith(String backendUrl) {
        ScoringTaskQueueProperties properties = new ScoringTaskQueueProperties(
                ScoringTaskQueueProperties.Mode.CLOUD_TASKS, "dev-gdgoc-dgu-homepage", "asia-northeast3", "scoring",
                backendUrl, INVOKER, Duration.ofSeconds(240));
        return new CloudTasksScoringTaskQueue(client, properties, JsonMapper.builder().build());
    }

    private Task capturedTask() {
        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(client).createTask(eq(PARENT), captor.capture());
        return captor.getValue();
    }

    @Test
    void 큐_경로와_요청_내용을_계약대로_만든다() {
        when(client.createTask(anyString(), any(Task.class)))
                .thenReturn(Task.newBuilder().setName(PARENT + "/tasks/1").build());

        queue.enqueue("a_7f3c", 2);

        Task task = capturedTask();
        assertThat(task.getHttpRequest().getUrl()).isEqualTo(BACKEND_URL + "/internal/scoring");
        assertThat(task.getHttpRequest().getHttpMethod()).isEqualTo(HttpMethod.POST);
        assertThat(task.getHttpRequest().getHeadersMap()).containsEntry("Content-Type", "application/json");
        assertThat(task.getHttpRequest().getBody().toStringUtf8())
                .isEqualTo("{\"aid\":\"a_7f3c\",\"criteriaVersion\":2}");
        assertThat(task.getHttpRequest().getOidcToken().getServiceAccountEmail()).isEqualTo(INVOKER);
        assertThat(task.getHttpRequest().getOidcToken().getAudience()).isEqualTo(BACKEND_URL);
        assertThat(task.getDispatchDeadline().getSeconds()).isEqualTo(240);
        assertThat(task.getName()).as("작업 이름을 정하면 재채점이 막힌다").isEmpty();
    }

    @Test
    void 주소_끝의_슬래시는_URL과_audience에서_빠진다() {
        queue = queueWith(BACKEND_URL + "/");
        when(client.createTask(anyString(), any(Task.class))).thenReturn(Task.getDefaultInstance());

        queue.enqueue("a_7f3c", 1);

        Task task = capturedTask();
        assertThat(task.getHttpRequest().getUrl()).isEqualTo(BACKEND_URL + "/internal/scoring");
        assertThat(task.getHttpRequest().getOidcToken().getAudience()).isEqualTo(BACKEND_URL);
    }

    @Test
    void 등록에_성공하면_aid_기준_버전_작업_이름을_로그로_남긴다(CapturedOutput output) {
        when(client.createTask(anyString(), any(Task.class)))
                .thenReturn(Task.newBuilder().setName(PARENT + "/tasks/123").build());

        queue.enqueue("a_7f3c", 2);

        assertThat(output.getAll())
                .contains("aid=a_7f3c")
                .contains("criteriaVersion=2")
                .contains("task=" + PARENT + "/tasks/123")
                .doesNotContain("WARN");
    }

    @Test
    void 클라이언트가_ApiException을_던져도_전파하지_않고_상태_코드만_경고로_남긴다(CapturedOutput output) {
        StatusCode code = GrpcStatusCode.of(io.grpc.Status.Code.PERMISSION_DENIED);
        when(client.createTask(anyString(), any(Task.class)))
                .thenThrow(new ApiException("secret-detail-body", new RuntimeException(), code, false));

        assertThatCode(() -> queue.enqueue("a_7f3c", 2)).doesNotThrowAnyException();

        assertThat(output.getAll())
                .contains("WARN")
                .contains("aid=a_7f3c")
                .contains("criteriaVersion=2")
                .contains("error=ApiException")
                .contains("grpcStatus=PERMISSION_DENIED")
                .doesNotContain("secret-detail-body");
    }

    @Test
    void 클라이언트가_일반_예외를_던져도_전파하지_않는다(CapturedOutput output) {
        when(client.createTask(anyString(), any(Task.class))).thenThrow(new IllegalStateException("boom"));

        assertThatCode(() -> queue.enqueue("a_7f3c", 2)).doesNotThrowAnyException();

        assertThat(output.getAll()).contains("WARN").contains("error=IllegalStateException").contains("grpcStatus=-");
    }

    @Test
    void aid가_null이면_클라이언트를_부르지_않고_경고를_남긴다(CapturedOutput output) {
        assertThatCode(() -> queue.enqueue(null, 1)).doesNotThrowAnyException();

        verifyNoInteractions(client);
        assertThat(output.getAll()).contains("WARN").contains("잘못된 입력");
    }

    @Test
    void aid가_공백이면_클라이언트를_부르지_않는다() {
        queue.enqueue("  ", 1);

        verifyNoInteractions(client);
    }

    @Test
    void 기준_버전이_1_미만이면_클라이언트를_부르지_않는다() {
        queue.enqueue("a_7f3c", 0);
        queue.enqueue("a_7f3c", -1);

        verify(client, never()).createTask(anyString(), any(Task.class));
    }
}
