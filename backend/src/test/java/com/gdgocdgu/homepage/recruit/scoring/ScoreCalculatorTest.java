package com.gdgocdgu.homepage.recruit.scoring;

import static org.assertj.core.api.Assertions.assertThat;

import com.gdgocdgu.homepage.recruit.scoring.GradingClient.GradingResponse;
import com.gdgocdgu.homepage.recruit.scoring.GradingClient.GradingResponse.ItemResult;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.CriteriaItem;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.ScoredResult;
import java.util.List;
import org.junit.jupiter.api.Test;

class ScoreCalculatorTest {

    private static final List<CriteriaItem> ITEMS = List.of(
            new CriteriaItem("a", "항목A", List.of("q1"), "guide", 33),
            new CriteriaItem("b", "항목B", List.of("q2"), "guide", 67));

    private static GradingResponse response(boolean success, List<ItemResult> results) {
        return new GradingResponse(success, "a_test", results, false, "model-x", "v1");
    }

    @Test
    void 항목_점수는_level_곱_weight_를_5로_나눈_값이다() {
        assertThat(ScoreCalculator.toScore(ScoreCalculator.tenths(4, 33))).isEqualTo(26.4);
        assertThat(ScoreCalculator.toScore(ScoreCalculator.tenths(3, 67))).isEqualTo(40.2);
        assertThat(ScoreCalculator.toScore(ScoreCalculator.tenths(5, 100))).isEqualTo(100.0);
    }

    @Test
    void 총점은_항목_점수의_합이고_실수_오차가_없다() {
        ScoredResult result = ScoreCalculator.score(ITEMS, response(true,
                List.of(new ItemResult("a", 4, "r1"), new ItemResult("b", 3, "r2"))));

        assertThat(result.items()).extracting("score").containsExactly(26.4, 40.2);
        assertThat(result.totalScore()).isEqualTo(66.6);
        assertThat(result.items().getFirst().name()).isEqualTo("항목A");
        assertThat(result.items().getFirst().weight()).isEqualTo(33);
        assertThat(result.model()).isEqualTo("model-x");
        assertThat(result.promptVersion()).isEqualTo("v1");
    }

    @Test
    void 항목_순서는_AI_응답이_아니라_기준을_따른다() {
        ScoredResult result = ScoreCalculator.score(ITEMS, response(true,
                List.of(new ItemResult("b", 3, "r2"), new ItemResult("a", 4, "r1"))));

        assertThat(result.items()).extracting("itemId").containsExactly("a", "b");
    }

    @Test
    void 요청한_항목을_모두_level_1에서_5로_돌려주면_유효하다() {
        assertThat(ScoreCalculator.isValid(ITEMS, response(true,
                List.of(new ItemResult("a", 1, "r"), new ItemResult("b", 5, "r"))))).isTrue();
    }

    @Test
    void 항목이_빠지거나_모르는_항목이거나_중복이면_유효하지_않다() {
        assertThat(ScoreCalculator.isValid(ITEMS, response(true, List.of(new ItemResult("a", 3, "r"))))).isFalse();
        assertThat(ScoreCalculator.isValid(ITEMS, response(true,
                List.of(new ItemResult("a", 3, "r"), new ItemResult("x", 3, "r"))))).isFalse();
        assertThat(ScoreCalculator.isValid(ITEMS, response(true,
                List.of(new ItemResult("a", 3, "r"), new ItemResult("a", 3, "r"))))).isFalse();
    }

    @Test
    void level이_범위를_벗어나거나_success가_false이거나_결과가_null이면_유효하지_않다() {
        assertThat(ScoreCalculator.isValid(ITEMS, response(true,
                List.of(new ItemResult("a", 0, "r"), new ItemResult("b", 3, "r"))))).isFalse();
        assertThat(ScoreCalculator.isValid(ITEMS, response(true,
                List.of(new ItemResult("a", 3, "r"), new ItemResult("b", 6, "r"))))).isFalse();
        assertThat(ScoreCalculator.isValid(ITEMS, response(false,
                List.of(new ItemResult("a", 3, "r"), new ItemResult("b", 3, "r"))))).isFalse();
        assertThat(ScoreCalculator.isValid(ITEMS, response(true, null))).isFalse();
        assertThat(ScoreCalculator.isValid(ITEMS, null)).isFalse();
    }
}
