package com.gdgocdgu.homepage.recruit.scoring;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.gdgocdgu.homepage.common.firestore.FirestoreProperties;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.RetryResult;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.ScoredItem;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.ScoredResult;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.Started;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * 에뮬레이터에서 FirestoreScoringRepository의 트랜잭션을 확인한다. 가짜 데이터만 쓴다.
 * 에뮬레이터가 꺼져 있으면 건너뛴다.
 */
@SpringBootTest
class FirestoreScoringRepositoryEmulatorTest {

    @Autowired
    Firestore firestore;
    @Autowired
    FirestoreProperties properties;
    @Autowired
    FirestoreScoringRepository repository;

    private String aid;
    private String rid;

    @BeforeEach
    void 에뮬레이터가_켜져_있을_때만_실행한다() throws Exception {
        assumeTrue(properties.usesEmulator(), "에뮬레이터 설정이 없는 프로필");
        assumeTrue(isReachable(properties.emulatorHost()), "에뮬레이터가 꺼져 있음: " + properties.emulatorHost());
        aid = "a_test_" + UUID.randomUUID().toString().substring(0, 8);
        rid = "rct_test_" + UUID.randomUUID().toString().substring(0, 8);

        DocumentReference recruitment = firestore.collection("recruitments").document(rid);
        recruitment.collection("criteriaVersions").document("1").set(Map.of("version", 1, "items", List.of(
                Map.of("itemId", "a", "name", "항목A", "questionIds", List.of("q1"), "guide", "가짜 기준", "weight", 100)))).get();
        recruitment.collection("formVersions").document("1").set(Map.of("version", 1, "questions", List.of(
                Map.of("questionId", "q1", "title", "가짜 문항", "type", "TEXT")))).get();
        firestore.collection("applications").document(aid).set(Map.of(
                "rid", rid, "formVersion", 1, "deleted", false,
                "applicant", Map.of("name", "가짜"),
                "answers", List.of(Map.of("questionId", "q1", "value", "가짜 답")),
                "scoring", Map.of("status", "PENDING", "criteriaVersion", 1, "attempts", 0))).get();
    }

    @AfterEach
    void 정리() throws Exception {
        if (aid == null) {
            return;
        }
        firestore.collection("applications").document(aid).delete().get();
        DocumentReference recruitment = firestore.collection("recruitments").document(rid);
        recruitment.collection("criteriaVersions").document("1").delete().get();
        recruitment.collection("formVersions").document("1").delete().get();
    }

    private DocumentSnapshot app() throws Exception {
        return firestore.collection("applications").document(aid).get().get();
    }

    @Test
    void 시작하면_RUNNING과_runId를_기록하고_입력을_읽는다() throws Exception {
        var result = repository.start(aid, 1, "run-1");

        assertThat(result).isInstanceOf(Started.class);
        assertThat(((Started) result).input().questionTitles()).containsEntry("q1", "가짜 문항");
        assertThat(((Started) result).input().items().getFirst().weight()).isEqualTo(100);
        assertThat(app().getString("scoring.status")).isEqualTo("RUNNING");
        assertThat(app().getString("scoring.runId")).isEqualTo("run-1");
        assertThat(repository.start(aid, 1, "run-2")).isEqualTo(new ScoringModels.Finished(ScoringStatus.RUNNING));
    }

    @Test
    void 기준_버전이_다르거나_없는_지원서는_SKIPPED_STALE이다() throws Exception {
        assertThat(repository.start(aid, 2, "run-1")).isEqualTo(new ScoringModels.Finished(ScoringStatus.SKIPPED_STALE));
        assertThat(repository.start("a_missing", 1, "run-1"))
                .isEqualTo(new ScoringModels.Finished(ScoringStatus.SKIPPED_STALE));
        assertThat(app().getString("scoring.status")).isEqualTo("PENDING");
    }

    @Test
    void 기준_문서가_없으면_FAILED로_저장한다() throws Exception {
        firestore.collection("recruitments").document(rid).collection("criteriaVersions").document("1").delete().get();

        assertThat(repository.start(aid, 1, "run-1")).isEqualTo(new ScoringModels.Finished(ScoringStatus.FAILED));
        assertThat(app().getString("scoring.error")).isEqualTo("CRITERIA_NOT_FOUND");
    }

    @Test
    void runId가_같을_때만_결과를_저장한다() throws Exception {
        repository.start(aid, 1, "run-1");
        ScoredResult result = new ScoredResult(List.of(new ScoredItem("a", "항목A", 4, 100, 80.0, "사유")),
                80.0, "m", "p1", false);

        assertThat(repository.saveDone(aid, 1, "other", result)).isFalse();
        assertThat(app().getString("scoring.status")).isEqualTo("RUNNING");
        assertThat(repository.saveDone(aid, 1, "run-1", result)).isTrue();
        assertThat(app().getString("scoring.status")).isEqualTo("DONE");
        assertThat(app().getDouble("scoring.totalScore")).isEqualTo(80.0);
    }

    @Test
    void 일시_실패는_PENDING으로_되돌리고_세_번_넘으면_FAILED이다() throws Exception {
        for (int i = 1; i <= 3; i++) {
            repository.start(aid, 1, "run-" + i);
            assertThat(repository.releaseForRetry(aid, 1, "run-" + i, "AI_UNAVAILABLE", 3)).isEqualTo(RetryResult.RETRY);
            assertThat(app().getString("scoring.status")).isEqualTo("PENDING");
            assertThat(app().getLong("scoring.attempts")).isEqualTo(i);
        }
        repository.start(aid, 1, "run-4");
        assertThat(repository.releaseForRetry(aid, 1, "run-4", "AI_UNAVAILABLE", 3)).isEqualTo(RetryResult.FAILED);
        assertThat(app().getString("scoring.status")).isEqualTo("FAILED");
    }

    private static boolean isReachable(String hostPort) {
        int colon = hostPort.lastIndexOf(':');
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(hostPort.substring(0, colon),
                    Integer.parseInt(hostPort.substring(colon + 1))), 500);
            return true;
        } catch (IOException e) {
            return false;
        }
    }
}
