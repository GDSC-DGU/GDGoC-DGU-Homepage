package com.gdgocdgu.homepage.recruit.scoring;

import java.util.List;

/**
 * AI 서버 {@code POST /grading} 호출. 구현은 예외를 던지지 않고 결과를 {@link GradingOutcome}으로 돌려준다.
 */
interface GradingClient {

    GradingOutcome grade(GradingRequest request);

    /** AI 요청 본문(camelCase JSON). 지원자 이름 · 학번 · 학과 · 이메일 · 전화번호는 담지 않는다. */
    record GradingRequest(String applicationId, List<Item> items, List<Answer> answers) {

        record Item(String itemId, String name, List<String> questionIds, String guide) {
        }

        record Answer(String questionId, String question, String text) {
        }
    }

    /** AI 응답 본문. 모르는 필드는 무시한다. */
    record GradingResponse(boolean success, String applicationId, List<ItemResult> results,
                           boolean instructionIgnored, String model, String promptVersion) {

        record ItemResult(String itemId, int level, String reason) {
        }
    }

    /** 호출 결과. 응답 내용(사유 · 답안)은 로그에 남기지 않으므로 실패는 코드만 담는다. */
    sealed interface GradingOutcome permits Success, Permanent, Transient {
    }

    record Success(GradingResponse response) implements GradingOutcome {
    }

    /** 다시 해도 같은 결과(AI 422 등). FAILED로 저장한다. */
    record Permanent(String errorCode) implements GradingOutcome {
    }

    /** 잠시 뒤 다시 하면 될 수 있는 실패(5xx · 시간 초과 · 연결 오류). */
    record Transient(String errorCode) implements GradingOutcome {
    }
}
