package com.gdgocdgu.homepage.recruit.scoring;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.gdgocdgu.homepage.recruit.scoring.GradingClient.GradingRequest;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.AnswerValue;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.CriteriaItem;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.ScoringInput;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class GradingRequestBuilderTest {

    private static final Map<String, String> TITLES = Map.of("q1", "제목1", "q2", "제목2", "q3", "제목3");

    @Test
    void 기준_항목이_가리키는_문항의_답만_중복_없이_처음_나온_순서로_담는다() {
        ScoringInput input = new ScoringInput(
                List.of(new CriteriaItem("i1", "n1", List.of("q2", "q1"), "g1", 50),
                        new CriteriaItem("i2", "n2", List.of("q1"), "g2", 50)),
                List.of(new AnswerValue("q1", "답1", null), new AnswerValue("q2", "답2", null),
                        new AnswerValue("q3", "참조되지 않는 답", null)),
                TITLES);

        GradingRequest request = GradingRequestBuilder.build("a_test", input);

        assertThat(request.applicationId()).isEqualTo("a_test");
        assertThat(request.items()).hasSize(2);
        assertThat(request.answers()).extracting("questionId").containsExactly("q2", "q1");
        assertThat(request.answers()).extracting("question").containsExactly("제목2", "제목1");
        assertThat(request.answers()).extracting("text").containsExactly("답2", "답1");
    }

    @Test
    void 선택형_답은_쉼표와_공백으로_이어_붙이고_답이_없으면_빈_문자열이다() {
        ScoringInput input = new ScoringInput(
                List.of(new CriteriaItem("i1", "n1", List.of("q1", "q2", "q3"), "g1", 100)),
                List.of(new AnswerValue("q1", null, List.of("가", "나", "다")),
                        new AnswerValue("q3", null, List.of())),
                TITLES);

        GradingRequest request = GradingRequestBuilder.build("a_test", input);

        assertThat(request.answers()).extracting("text").containsExactly("가, 나, 다", "", "");
    }

    @Test
    void 폼에_없는_문항을_참조하면_입력_오류다() {
        ScoringInput input = new ScoringInput(
                List.of(new CriteriaItem("i1", "n1", List.of("q9"), "g1", 100)), List.of(), TITLES);

        assertThatThrownBy(() -> GradingRequestBuilder.build("a_test", input))
                .isInstanceOf(InvalidScoringInputException.class)
                .extracting(e -> ((InvalidScoringInputException) e).errorCode())
                .isEqualTo("FORM_QUESTION_NOT_FOUND");
    }

    @Test
    void 요청_JSON에는_지원자_개인정보_필드가_없고_camelCase_이다() {
        ScoringInput input = new ScoringInput(
                List.of(new CriteriaItem("i1", "n1", List.of("q1"), "g1", 100)),
                List.of(new AnswerValue("q1", "답", null)), TITLES);

        String json = JsonMapper.builder().build().writeValueAsString(GradingRequestBuilder.build("a_test", input));

        assertThat(json).contains("\"applicationId\"", "\"itemId\"", "\"questionIds\"", "\"questionId\"");
        assertThat(json).doesNotContain("applicant", "name\":\"홍", "studentId", "major", "email", "phone");
    }
}
