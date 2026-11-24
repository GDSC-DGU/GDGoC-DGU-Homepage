package com.gdgocdgu.homepage.recruit.scoring;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class ScoringRecoveryServiceTest {

    private static final Instant NOW = Instant.parse("2026-03-01T12:00:00Z");

    private final FakeScoringRepository repository = new FakeScoringRepository();
    private final List<String> enqueued = new ArrayList<>();
    private final ScoringTaskQueue queue = (aid, version) -> {
        repository.events.add("enqueue:" + aid);
        enqueued.add(aid + ":" + version);
    };
    private final ScoringRecoveryService service =
            new ScoringRecoveryService(repository, queue, Clock.fixed(NOW, ZoneOffset.UTC));

    private FakeScoringRepository.Doc pending(String aid, Duration age) {
        FakeScoringRepository.Doc doc = repository.add(aid);
        doc.status = "PENDING";
        doc.requestedAt = NOW.minus(age);
        return doc;
    }

    private FakeScoringRepository.Doc running(String aid, Duration age) {
        FakeScoringRepository.Doc doc = repository.add(aid);
        doc.status = "RUNNING";
        doc.runId = "run-old";
        doc.startedAt = NOW.minus(age);
        return doc;
    }

    @Test
    void 오래된_PENDING은_저장된_기준_버전으로_다시_등록한다() {
        FakeScoringRepository.Doc doc = pending("a1", Duration.ofMinutes(6));
        doc.criteriaVersion = 3;

        assertThat(service.recover()).isEqualTo(1);

        assertThat(enqueued).containsExactly("a1:3");
        assertThat(doc.status).isEqualTo("PENDING");
        assertThat(doc.requestedAt).isEqualTo(NOW);
        assertThat(doc.attempts).isZero();
    }

    @Test
    void 오래된_RUNNING은_PENDING으로_되돌리고_attempts를_올린다() {
        FakeScoringRepository.Doc doc = running("a1", Duration.ofMinutes(11));
        doc.attempts = 1;

        assertThat(service.recover()).isEqualTo(1);

        assertThat(doc.status).isEqualTo("PENDING");
        assertThat(doc.runId).isNull();
        assertThat(doc.attempts).isEqualTo(2);
        assertThat(doc.requestedAt).isEqualTo(NOW);
        assertThat(enqueued).containsExactly("a1:1");
    }

    @Test
    void attempts가_이미_3이면_FAILED로_저장하고_등록하지_않는다() {
        FakeScoringRepository.Doc doc = running("a1", Duration.ofMinutes(11));
        doc.attempts = 3;

        assertThat(service.recover()).isZero();

        assertThat(doc.status).isEqualTo("FAILED");
        assertThat(doc.error).isEqualTo("SCORING_TIMEOUT");
        assertThat(doc.runId).isNull();
        assertThat(enqueued).isEmpty();
    }

    @Test
    void 최근_PENDING_RUNNING과_DONE_FAILED는_건드리지_않는다() {
        FakeScoringRepository.Doc recentPending = pending("a1", Duration.ofMinutes(4));
        FakeScoringRepository.Doc recentRunning = running("a2", Duration.ofMinutes(9));
        FakeScoringRepository.Doc done = pending("a3", Duration.ofHours(1));
        done.status = "DONE";
        FakeScoringRepository.Doc failed = pending("a4", Duration.ofHours(1));
        failed.status = "FAILED";

        assertThat(service.recover()).isZero();

        assertThat(enqueued).isEmpty();
        assertThat(recentPending.requestedAt).isEqualTo(NOW.minus(Duration.ofMinutes(4)));
        assertThat(recentRunning.status).isEqualTo("RUNNING");
        assertThat(done.status).isEqualTo("DONE");
        assertThat(failed.status).isEqualTo("FAILED");
    }

    @Test
    void 삭제된_지원서는_건너뛴다() {
        pending("a1", Duration.ofMinutes(30)).deleted = true;

        assertThat(service.recover()).isZero();
        assertThat(enqueued).isEmpty();
    }

    @Test
    void 큐_등록은_저장소_갱신_뒤에만_일어난다() {
        pending("a1", Duration.ofMinutes(6));
        running("a2", Duration.ofMinutes(11));

        service.recover();

        assertThat(repository.events).containsExactly("update:a1", "enqueue:a1", "update:a2", "enqueue:a2");
    }

    @Test
    void 한_건이_실패해도_나머지를_계속_처리한다() {
        pending("a1", Duration.ofMinutes(10));
        pending("a2", Duration.ofMinutes(9));
        pending("a3", Duration.ofMinutes(8));
        repository.failRequeueFor.add("a2");

        assertThat(service.recover()).isEqualTo(2);
        assertThat(enqueued).containsExactly("a1:1", "a3:1");
    }

    @Test
    void 처리한_건수만_센다() {
        pending("a1", Duration.ofMinutes(6));
        pending("a2", Duration.ofMinutes(7));
        running("a3", Duration.ofMinutes(20));
        FakeScoringRepository.Doc exhausted = running("a4", Duration.ofMinutes(20));
        exhausted.attempts = 3;
        pending("a5", Duration.ofMinutes(1));

        assertThat(service.recover()).isEqualTo(3);
    }

    @Test
    void 상태별로_최대_100건만_처리한다() {
        for (int i = 0; i < 105; i++) {
            pending("p" + i, Duration.ofMinutes(10));
        }

        assertThat(service.recover()).isEqualTo(100);
    }
}
