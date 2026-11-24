package com.gdgocdgu.homepage.recruit.scoring;

import java.util.List;
import java.util.Map;

/** 채점 흐름에서 repository · service · AI 클라이언트가 주고받는 값 모음. */
final class ScoringModels {

    private ScoringModels() {
    }

    /** 평가 기준 항목. {@code weight}는 정수 가중치(항목 가중치의 합 100). */
    record CriteriaItem(String itemId, String name, List<String> questionIds, String guide, int weight) {
    }

    /** 지원서의 답. 단답 · 서술은 {@code value}, 선택형은 {@code values}. */
    record AnswerValue(String questionId, String value, List<String> values) {
    }

    /** AI 호출에 필요한 입력. 지원자 개인정보는 읽지도 않는다. */
    record ScoringInput(List<CriteriaItem> items, List<AnswerValue> answers, Map<String, String> questionTitles) {
    }

    /** 점수를 계산한 항목 하나. {@code score}는 소수 1자리. */
    record ScoredItem(String itemId, String name, int level, int weight, double score, String reason) {
    }

    /** DONE으로 저장할 결과. */
    record ScoredResult(List<ScoredItem> items, double totalScore, String model, String promptVersion,
                        boolean instructionIgnored) {
    }

    /** 채점 시작 트랜잭션의 결과. */
    sealed interface StartResult permits Started, Finished {
    }

    /** PENDING → RUNNING으로 바꿨다. AI를 호출해야 한다. */
    record Started(ScoringInput input) implements StartResult {
    }

    /** 채점하지 않고 끝낸다(이미 진행 중 · 완료 · 실패, 오래된 요청, 입력 문서 오류). */
    record Finished(ScoringStatus status) implements StartResult {
    }

    /** 일시 실패를 기록한 결과. */
    enum RetryResult {
        /** PENDING으로 되돌렸다. 503을 돌려 재시도하게 한다. */
        RETRY,
        /** 시도 횟수를 넘겨 FAILED로 저장했다. */
        FAILED,
        /** 기준 버전 · 실행 번호가 달라 건드리지 않았다. */
        STALE
    }

    /** 멈춘 채점의 종류. 어느 시각 필드({@code requestedAt} · {@code startedAt})로 판단할지 정한다. */
    enum StuckKind {
        PENDING("PENDING", "scoring.requestedAt"),
        RUNNING("RUNNING", "scoring.startedAt");

        final String status;
        final String timeField;

        StuckKind(String status, String timeField) {
            this.status = status;
            this.timeField = timeField;
        }
    }

    /** 멈춘 것으로 보이는 지원서. 다시 넣기 전에 트랜잭션에서 한 번 더 확인한다. */
    record StuckApplication(String aid, StuckKind kind) {
    }

    /** 멈춘 채점을 다시 넣은 결과. */
    enum RequeueOutcome {
        /** PENDING으로 되돌렸다. 큐에 다시 등록해야 한다. */
        REQUEUED,
        /** 시도 횟수를 넘겨 FAILED로 저장했다. 큐에 등록하지 않는다. */
        FAILED,
        /** 문서가 없거나 삭제됐거나 이미 멈춘 상태가 아니라 건드리지 않았다. */
        SKIPPED
    }

    /** {@code criteriaVersion}은 {@code REQUEUED}일 때 큐에 넣을 기준 버전이다(그 밖에는 0). */
    record RequeueResult(RequeueOutcome outcome, int criteriaVersion) {
    }
}
