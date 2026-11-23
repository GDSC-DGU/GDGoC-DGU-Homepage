package com.gdgocdgu.homepage.recruit.scoring;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.recruit.scoring.GradingClient.GradingOutcome;
import com.gdgocdgu.homepage.recruit.scoring.GradingClient.GradingRequest;
import com.gdgocdgu.homepage.recruit.scoring.GradingClient.GradingResponse;
import com.gdgocdgu.homepage.recruit.scoring.GradingClient.GradingResponse.ItemResult;
import com.gdgocdgu.homepage.recruit.scoring.GradingClient.Permanent;
import com.gdgocdgu.homepage.recruit.scoring.GradingClient.Success;
import com.gdgocdgu.homepage.recruit.scoring.GradingClient.Transient;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.AnswerValue;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.CriteriaItem;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.ScoringInput;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ScoringServiceTest {

    private static final String AID = "a_test";

    private final FakeScoringRepository repository = new FakeScoringRepository();
    private final List<GradingRequest> requests = new ArrayList<>();
    private GradingOutcome outcome;
    private final ScoringService service = new ScoringService(repository, request -> {
        requests.add(request);
        return outcome;
    });

    @BeforeEach
    void 준비() {
        repository.input = new ScoringInput(
                List.of(new CriteriaItem("a", "항목A", List.of("q1"), "guide", 33),
                        new CriteriaItem("b", "항목B", List.of("q2"), "guide", 67)),
                List.of(new AnswerValue("q1", "답1", null), new AnswerValue("q2", null, List.of("x", "y"))),
                Map.of("q1", "제목1", "q2", "제목2"));
        outcome = new Success(new GradingResponse(true, AID,
                List.of(new ItemResult("a", 4, "r1"), new ItemResult("b", 3, "r2")), false, "m", "p1"));
    }

    @Test
    void PENDING이면_AI를_호출하고_DONE으로_저장한다() {
        FakeScoringRepository.Doc doc = repository.add(AID);

        ScoringStatus status = service.score(AID, 1);

        assertThat(status).isEqualTo(ScoringStatus.DONE);
        assertThat(doc.status).isEqualTo("DONE");
        assertThat(doc.result.totalScore()).isEqualTo(66.6);
        assertThat(doc.result.items()).extracting("score").containsExactly(26.4, 40.2);
        assertThat(requests).hasSize(1);
        assertThat(requests.getFirst().applicationId()).isEqualTo(AID);
        assertThat(requests.getFirst().answers()).extracting("text").containsExactly("답1", "x, y");
    }

    @Test
    void RUNNING_DONE_FAILED는_AI를_부르지_않고_현재_상태를_돌려준다() {
        for (String state : List.of("RUNNING", "DONE", "FAILED")) {
            repository.add(AID).status = state;

            assertThat(service.score(AID, 1)).isEqualTo(ScoringStatus.valueOf(state));
        }
        assertThat(requests).isEmpty();
    }

    @Test
    void 기준_버전이_다르면_SKIPPED_STALE이고_문서를_바꾸지_않는다() {
        FakeScoringRepository.Doc doc = repository.add(AID);
        doc.criteriaVersion = 2;

        assertThat(service.score(AID, 1)).isEqualTo(ScoringStatus.SKIPPED_STALE);
        assertThat(doc.status).isEqualTo("PENDING");
        assertThat(doc.runId).isNull();
        assertThat(requests).isEmpty();
    }

    @Test
    void 지원서가_없거나_삭제됐으면_SKIPPED_STALE이다() {
        assertThat(service.score("a_missing", 1)).isEqualTo(ScoringStatus.SKIPPED_STALE);

        repository.add(AID).deleted = true;
        assertThat(service.score(AID, 1)).isEqualTo(ScoringStatus.SKIPPED_STALE);
        assertThat(requests).isEmpty();
    }

    @Test
    void 저장_전에_실행_번호가_바뀌었으면_결과를_버리고_SKIPPED_STALE이다() {
        FakeScoringRepository.Doc doc = repository.add(AID);
        repository.takeOverAfterStart = true;

        assertThat(service.score(AID, 1)).isEqualTo(ScoringStatus.SKIPPED_STALE);
        assertThat(doc.status).isEqualTo("RUNNING");
        assertThat(doc.runId).isEqualTo("other-run");
        assertThat(doc.result).isNull();
    }

    @Test
    void 실행_번호가_바뀐_뒤의_실패도_문서를_건드리지_않는다() {
        FakeScoringRepository.Doc doc = repository.add(AID);
        repository.takeOverAfterStart = true;
        outcome = new Transient("AI_UNAVAILABLE");

        assertThat(service.score(AID, 1)).isEqualTo(ScoringStatus.SKIPPED_STALE);
        assertThat(doc.attempts).isZero();
        assertThat(doc.status).isEqualTo("RUNNING");

        FakeScoringRepository.Doc second = repository.add("a_second");
        outcome = new Permanent("AI_VALIDATION_FAILED");
        assertThat(service.score("a_second", 1)).isEqualTo(ScoringStatus.SKIPPED_STALE);
        assertThat(second.status).isEqualTo("RUNNING");
        assertThat(second.error).isNull();
    }

    @Test
    void AI_422는_영구_실패로_FAILED_200이다() {
        FakeScoringRepository.Doc doc = repository.add(AID);
        outcome = new Permanent("AI_VALIDATION_FAILED");

        assertThat(service.score(AID, 1)).isEqualTo(ScoringStatus.FAILED);
        assertThat(doc.status).isEqualTo("FAILED");
        assertThat(doc.error).isEqualTo("AI_VALIDATION_FAILED");
        assertThat(doc.attempts).isZero();
    }

    @Test
    void 일시_실패는_PENDING으로_되돌리고_attempts를_올리고_SCORING_RETRY를_던진다() {
        FakeScoringRepository.Doc doc = repository.add(AID);
        outcome = new Transient("AI_UNAVAILABLE");

        assertThatThrownBy(() -> service.score(AID, 1))
                .isInstanceOfSatisfying(ApiException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(RecruitScoringErrorCode.SCORING_RETRY);
                    assertThat(e.getErrorCode().status().value()).isEqualTo(503);
                });
        assertThat(doc.status).isEqualTo("PENDING");
        assertThat(doc.runId).isNull();
        assertThat(doc.attempts).isEqualTo(1);
        assertThat(doc.error).isEqualTo("AI_UNAVAILABLE");
        assertThat(doc.criteriaVersion).isEqualTo(1);
    }

    @Test
    void 재시도가_PENDING으로_돌아간_뒤_다시_채점할_수_있다() {
        FakeScoringRepository.Doc doc = repository.add(AID);
        outcome = new Transient("AI_UNAVAILABLE");
        assertThatThrownBy(() -> service.score(AID, 1)).isInstanceOf(ApiException.class);
        outcome = new Success(new GradingResponse(true, AID,
                List.of(new ItemResult("a", 5, "r"), new ItemResult("b", 5, "r")), true, "m", "p1"));

        assertThat(service.score(AID, 1)).isEqualTo(ScoringStatus.DONE);
        assertThat(doc.result.totalScore()).isEqualTo(100.0);
        assertThat(doc.result.instructionIgnored()).isTrue();
    }

    @Test
    void 네_번째_일시_실패는_FAILED_200이다() {
        FakeScoringRepository.Doc doc = repository.add(AID);
        outcome = new Transient("AI_UNAVAILABLE");

        for (int i = 1; i <= 3; i++) {
            assertThatThrownBy(() -> service.score(AID, 1)).isInstanceOf(ApiException.class);
            assertThat(doc.attempts).isEqualTo(i);
            assertThat(doc.status).isEqualTo("PENDING");
        }

        assertThat(service.score(AID, 1)).isEqualTo(ScoringStatus.FAILED);
        assertThat(doc.attempts).isEqualTo(4);
        assertThat(doc.status).isEqualTo("FAILED");
        assertThat(doc.error).isEqualTo("AI_UNAVAILABLE");
    }

    @Test
    void AI_응답이_요청한_항목과_다르면_일시_실패로_다룬다() {
        FakeScoringRepository.Doc doc = repository.add(AID);
        outcome = new Success(new GradingResponse(true, AID, List.of(new ItemResult("a", 4, "r")), false, "m", "p"));

        assertThatThrownBy(() -> service.score(AID, 1)).isInstanceOf(ApiException.class);
        assertThat(doc.status).isEqualTo("PENDING");
        assertThat(doc.attempts).isEqualTo(1);
        assertThat(doc.error).isEqualTo("AI_OUTPUT_INVALID");
    }

    @Test
    void 기준_문서_오류로_시작_단계에서_FAILED가_되면_AI를_부르지_않는다() {
        FakeScoringRepository.Doc doc = repository.add(AID);
        doc.inputError = "CRITERIA_NOT_FOUND";

        assertThat(service.score(AID, 1)).isEqualTo(ScoringStatus.FAILED);
        assertThat(doc.error).isEqualTo("CRITERIA_NOT_FOUND");
        assertThat(requests).isEmpty();
    }

    @Test
    void 폼에_없는_문항을_참조하면_AI를_부르지_않고_FAILED로_저장한다() {
        FakeScoringRepository.Doc doc = repository.add(AID);
        repository.input = new ScoringInput(
                List.of(new CriteriaItem("a", "항목A", List.of("q9"), "guide", 100)), List.of(), Map.of());

        assertThat(service.score(AID, 1)).isEqualTo(ScoringStatus.FAILED);
        assertThat(doc.error).isEqualTo("FORM_QUESTION_NOT_FOUND");
        assertThat(requests).isEmpty();
    }

    // --- AI 서버 제한 사전 검증 (ai/app/grading/schemas.py와 같은 값) ---

    private static ScoringInput inputWith(int itemCount, int questionsPerItem, String answerText, String guide) {
        List<CriteriaItem> items = new ArrayList<>();
        Map<String, String> titles = new java.util.HashMap<>();
        List<AnswerValue> answers = new ArrayList<>();
        int q = 0;
        for (int i = 0; i < itemCount; i++) {
            List<String> ids = new ArrayList<>();
            for (int j = 0; j < questionsPerItem; j++) {
                String id = "q" + q++;
                ids.add(id);
                titles.put(id, "제목" + id);
                answers.add(new AnswerValue(id, answerText, null));
            }
            items.add(new CriteriaItem("i" + i, "항목" + i, ids, guide, 1));
        }
        return new ScoringInput(items, answers, titles);
    }

    private static ScoringInput itemsOnSameQuestion(int itemCount) {
        List<CriteriaItem> items = new ArrayList<>();
        for (int i = 0; i < itemCount; i++) {
            items.add(new CriteriaItem("i" + i, "항목" + i, List.of("q0"), "guide", 1));
        }
        return new ScoringInput(items, List.of(new AnswerValue("q0", "답", null)), Map.of("q0", "제목"));
    }

    private void assertTooLarge(ScoringInput input) {
        FakeScoringRepository.Doc doc = repository.add(AID);
        repository.input = input;

        assertThat(service.score(AID, 1)).isEqualTo(ScoringStatus.FAILED);
        assertThat(doc.status).isEqualTo("FAILED");
        assertThat(doc.error).isEqualTo("GRADING_INPUT_TOO_LARGE");
        assertThat(requests).isEmpty();
    }

    private void assertPasses(ScoringInput input) {
        repository.add(AID);
        repository.input = input;
        outcome = new Transient("AI_UNAVAILABLE");

        assertThatThrownBy(() -> service.score(AID, 1)).isInstanceOf(ApiException.class);
        assertThat(requests).hasSize(1);
    }

    @Test
    void 참조_문항이_10개면_AI를_호출한다() {
        assertPasses(inputWith(1, 10, "답", "guide"));
    }

    @Test
    void 참조_문항이_11개면_AI를_부르지_않고_FAILED_GRADING_INPUT_TOO_LARGE이다() {
        assertTooLarge(inputWith(2, 6, "답", "guide")); // 서로 다른 문항 12개
        repository.docs.clear();
        requests.clear();
        assertTooLarge(inputWith(1, 11, "답", "guide")); // 한 항목이 11개를 가리킴(항목당 10개 제한도 걸린다)
    }

    @Test
    void 서로_다른_문항이_정확히_11개면_FAILED이다() {
        List<CriteriaItem> items = List.of(
                new CriteriaItem("a", "A", List.of("q0", "q1", "q2", "q3", "q4", "q5"), "g", 50),
                new CriteriaItem("b", "B", List.of("q5", "q6", "q7", "q8", "q9", "q10"), "g", 50));
        Map<String, String> titles = new java.util.HashMap<>();
        for (int i = 0; i <= 10; i++) {
            titles.put("q" + i, "제목");
        }
        assertTooLarge(new ScoringInput(items, List.of(), titles));
    }

    @Test
    void 답안_텍스트_5000자는_통과하고_5001자는_FAILED이다() {
        assertPasses(inputWith(1, 1, "가".repeat(5000), "guide"));
        repository.docs.clear();
        requests.clear();
        assertTooLarge(inputWith(1, 1, "가".repeat(5001), "guide"));
    }

    @Test
    void 항목_20개는_통과하고_21개는_FAILED이다() {
        // 항목이 모두 같은 문항 하나를 가리켜 답변 수 제한(10)과 분리한다.
        assertPasses(itemsOnSameQuestion(20));
        repository.docs.clear();
        requests.clear();
        assertTooLarge(itemsOnSameQuestion(21));
    }

    @Test
    void 가이드_2000자는_통과하고_2001자는_FAILED이다() {
        assertPasses(inputWith(1, 1, "답", "가".repeat(2000)));
        repository.docs.clear();
        requests.clear();
        assertTooLarge(inputWith(1, 1, "답", "가".repeat(2001)));
    }

    @Test
    void 길이는_코드_포인트_수로_센다() {
        // 이모지는 UTF-16 2칸이지만 파이썬 len으로는 1이다. 5000개면 통과해야 한다.
        assertPasses(inputWith(1, 1, "😀".repeat(5000), "guide"));
    }
}
