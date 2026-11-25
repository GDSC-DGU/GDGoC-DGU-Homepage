package com.gdgocdgu.homepage.recruit.scoring;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.gdgocdgu.homepage.common.firestore.FirestoreProperties;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.RequeueOutcome;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.RequeueResult;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.StuckApplication;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.StuckKind;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * 에뮬레이터에서 멈춘 채점 조회 · 재처리 트랜잭션을 확인한다. 가짜 데이터만 쓰고, 문서 ID에 무작위 값을 붙여
 * 다른 테스트와 섞이지 않게 하며 끝나면 지운다. 에뮬레이터가 꺼져 있으면 건너뛴다.
 * (에뮬레이터는 복합 색인을 검사하지 않는다.)
 */
@SpringBootTest
class FirestoreScoringRecoveryEmulatorTest {

    // Firestore는 시각을 마이크로초까지만 저장한다. Linux의 Instant.now()는 나노초까지 있어 저장 후 값과 달라지므로 맞춰 자른다.
    private static final Instant NOW = Instant.now().truncatedTo(ChronoUnit.MICROS);
    private static final Instant PENDING_CUTOFF = NOW.minus(Duration.ofMinutes(5));
    private static final Instant RUNNING_CUTOFF = NOW.minus(Duration.ofMinutes(10));

    @Autowired
    Firestore firestore;
    @Autowired
    FirestoreProperties properties;
    @Autowired
    FirestoreScoringRepository repository;

    private String prefix;
    private final List<String> created = new ArrayList<>();

    @BeforeEach
    void 에뮬레이터가_켜져_있을_때만_실행한다() {
        assumeTrue(properties.usesEmulator(), "에뮬레이터 설정이 없는 프로필");
        assumeTrue(isReachable(properties.emulatorHost()), "에뮬레이터가 꺼져 있음: " + properties.emulatorHost());
        prefix = "a_rec_" + UUID.randomUUID().toString().substring(0, 8) + "_";
    }

    @AfterEach
    void 정리() throws Exception {
        for (String aid : created) {
            firestore.collection("applications").document(aid).delete().get();
        }
    }

    private String put(String name, String status, Duration age, Map<String, Object> extra) throws Exception {
        String aid = prefix + name;
        created.add(aid);
        Timestamp time = toTimestamp(NOW.minus(age));
        Map<String, Object> scoring = new HashMap<>();
        scoring.put("status", status);
        scoring.put("criteriaVersion", 2);
        scoring.put("attempts", 0);
        scoring.put("requestedAt", time);
        if ("RUNNING".equals(status)) {
            scoring.put("startedAt", time);
            scoring.put("runId", "run-old");
        }
        scoring.putAll(extra);
        firestore.collection("applications").document(aid)
                .set(Map.of("deleted", false, "scoring", scoring)).get();
        return aid;
    }

    private static Timestamp toTimestamp(Instant instant) {
        return Timestamp.ofTimeSecondsAndNanos(instant.getEpochSecond(), instant.getNano());
    }

    private DocumentSnapshot read(String aid) throws Exception {
        return firestore.collection("applications").document(aid).get().get();
    }

    private List<String> found(StuckKind kind, Instant cutoff) {
        return repository.findStuck(kind, cutoff, 100).stream()
                .map(StuckApplication::aid).filter(aid -> aid.startsWith(prefix)).toList();
    }

    @Test
    void 조회는_상태와_시각_기준으로_오래된_순서로_찾는다() throws Exception {
        String old = put("old", "PENDING", Duration.ofMinutes(30), Map.of());
        String mid = put("mid", "PENDING", Duration.ofMinutes(6), Map.of());
        put("recent", "PENDING", Duration.ofMinutes(4), Map.of());
        put("done", "DONE", Duration.ofMinutes(60), Map.of());
        String run = put("run", "RUNNING", Duration.ofMinutes(11), Map.of());
        put("runRecent", "RUNNING", Duration.ofMinutes(9), Map.of());

        assertThat(found(StuckKind.PENDING, PENDING_CUTOFF)).containsExactly(old, mid);
        assertThat(found(StuckKind.RUNNING, RUNNING_CUTOFF)).containsExactly(run);
    }

    @Test
    void 조회_건수는_limit로_제한한다() throws Exception {
        put("a", "PENDING", Duration.ofMinutes(30), Map.of());
        put("b", "PENDING", Duration.ofMinutes(20), Map.of());

        assertThat(repository.findStuck(StuckKind.PENDING, PENDING_CUTOFF, 1)).hasSize(1);
    }

    @Test
    void PENDING_재처리는_requestedAt을_갱신하고_기준_버전은_그대로다() throws Exception {
        String aid = put("p", "PENDING", Duration.ofMinutes(6), Map.of());

        RequeueResult result = repository.requeueIfStuck(aid, StuckKind.PENDING, PENDING_CUTOFF, NOW, 3);

        assertThat(result).isEqualTo(new RequeueResult(RequeueOutcome.REQUEUED, 2));
        DocumentSnapshot app = read(aid);
        assertThat(app.getString("scoring.status")).isEqualTo("PENDING");
        assertThat(app.getTimestamp("scoring.requestedAt")).isEqualTo(toTimestamp(NOW));
        assertThat(app.getLong("scoring.attempts")).isZero();
        assertThat(app.getLong("scoring.criteriaVersion")).isEqualTo(2);
    }

    @Test
    void RUNNING_재처리는_PENDING으로_바꾸고_runId를_지우고_attempts를_올린다() throws Exception {
        String aid = put("r", "RUNNING", Duration.ofMinutes(11), Map.of("attempts", 2));

        RequeueResult result = repository.requeueIfStuck(aid, StuckKind.RUNNING, RUNNING_CUTOFF, NOW, 3);

        assertThat(result).isEqualTo(new RequeueResult(RequeueOutcome.REQUEUED, 2));
        DocumentSnapshot app = read(aid);
        assertThat(app.getString("scoring.status")).isEqualTo("PENDING");
        assertThat(app.getString("scoring.runId")).isNull();
        assertThat(app.getLong("scoring.attempts")).isEqualTo(3);
        assertThat(app.getTimestamp("scoring.requestedAt")).isEqualTo(toTimestamp(NOW));
    }

    @Test
    void RUNNING에서_attempts가_넘치면_FAILED로_저장한다() throws Exception {
        String aid = put("f", "RUNNING", Duration.ofMinutes(11), Map.of("attempts", 3));

        RequeueResult result = repository.requeueIfStuck(aid, StuckKind.RUNNING, RUNNING_CUTOFF, NOW, 3);

        assertThat(result.outcome()).isEqualTo(RequeueOutcome.FAILED);
        DocumentSnapshot app = read(aid);
        assertThat(app.getString("scoring.status")).isEqualTo("FAILED");
        assertThat(app.getString("scoring.error")).isEqualTo("SCORING_TIMEOUT");
        assertThat(app.getString("scoring.runId")).isNull();
        assertThat(app.getLong("scoring.attempts")).isEqualTo(4);
    }

    @Test
    void 조회_뒤_DONE이_되거나_최근이_되거나_삭제되거나_없으면_건너뛴다() throws Exception {
        String raced = put("raced", "PENDING", Duration.ofMinutes(6), Map.of());
        String refreshed = put("refreshed", "PENDING", Duration.ofMinutes(6), Map.of());
        String deleted = put("deleted", "PENDING", Duration.ofMinutes(6), Map.of());
        assertThat(found(StuckKind.PENDING, PENDING_CUTOFF)).containsExactlyInAnyOrder(raced, refreshed, deleted);

        firestore.collection("applications").document(raced).update("scoring.status", "DONE").get();
        firestore.collection("applications").document(refreshed)
                .update("scoring.requestedAt", toTimestamp(NOW.minusSeconds(30))).get();
        firestore.collection("applications").document(deleted).update("deleted", true).get();

        for (String aid : List.of(raced, refreshed, deleted, prefix + "missing")) {
            assertThat(repository.requeueIfStuck(aid, StuckKind.PENDING, PENDING_CUTOFF, NOW, 3).outcome())
                    .isEqualTo(RequeueOutcome.SKIPPED);
        }
        assertThat(read(raced).getString("scoring.status")).isEqualTo("DONE");
        assertThat(read(refreshed).getTimestamp("scoring.requestedAt")).isEqualTo(toTimestamp(NOW.minusSeconds(30)));
    }

    @Test
    void 삭제된_멈춘_문서가_100건_넘어도_정상_문서를_찾아_재처리한다() throws Exception {
        for (int i = 0; i < 101; i++) {
            String aid = prefix + "del" + i;
            created.add(aid);
            firestore.collection("applications").document(aid).set(Map.of("deleted", true, "scoring", Map.of(
                    "status", "PENDING", "criteriaVersion", 2, "attempts", 0,
                    "requestedAt", toTimestamp(NOW.minus(Duration.ofDays(2)))))).get();
        }
        String normal = put("normal", "PENDING", Duration.ofMinutes(6), Map.of());

        List<String> candidates = repository.findStuck(StuckKind.PENDING, PENDING_CUTOFF, 100).stream()
                .map(StuckApplication::aid).filter(aid -> aid.startsWith(prefix)).toList();
        assertThat(candidates).containsExactly(normal);
        assertThat(repository.requeueIfStuck(normal, StuckKind.PENDING, PENDING_CUTOFF, NOW, 3).outcome())
                .isEqualTo(RequeueOutcome.REQUEUED);
    }

    @Test
    void 기준_버전이_없으면_CRITERIA_NOT_FOUND로_FAILED_처리하고_등록하지_않는다() throws Exception {
        String aid = put("nov", "PENDING", Duration.ofMinutes(6), Map.of());
        firestore.collection("applications").document(aid)
                .update("scoring.criteriaVersion", com.google.cloud.firestore.FieldValue.delete()).get();

        RequeueResult result = repository.requeueIfStuck(aid, StuckKind.PENDING, PENDING_CUTOFF, NOW, 3);

        assertThat(result).isEqualTo(new RequeueResult(RequeueOutcome.FAILED, 0));
        assertThat(read(aid).getString("scoring.status")).isEqualTo("FAILED");
        assertThat(read(aid).getString("scoring.error")).isEqualTo("CRITERIA_NOT_FOUND");
    }

    @Test
    void 기준_버전이_문자열이면_APPLICATION_INVALID로_FAILED_처리한다() throws Exception {
        String aid = put("strv", "PENDING", Duration.ofMinutes(6), Map.of("criteriaVersion", "2"));

        RequeueResult result = repository.requeueIfStuck(aid, StuckKind.PENDING, PENDING_CUTOFF, NOW, 3);

        assertThat(result).isEqualTo(new RequeueResult(RequeueOutcome.FAILED, 0));
        assertThat(read(aid).getString("scoring.status")).isEqualTo("FAILED");
        assertThat(read(aid).getString("scoring.error")).isEqualTo("APPLICATION_INVALID");
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
