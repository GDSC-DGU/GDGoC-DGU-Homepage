package com.gdgocdgu.homepage.recruit.scoring;

import com.gdgocdgu.homepage.recruit.scoring.GradingClient.GradingRequest;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.AnswerValue;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.CriteriaItem;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.ScoringInput;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 기준 · 폼 · 지원서 답안을 AI 요청으로 바꾼다.
 * 기준 항목이 가리키는 문항의 답만 보내고(중복 제거, 처음 나온 순서), 지원자 개인정보는 입력에 없다.
 */
final class GradingRequestBuilder {

    private GradingRequestBuilder() {
    }

    static GradingRequest build(String aid, ScoringInput input) {
        List<GradingRequest.Item> items = new ArrayList<>();
        Set<String> questionIds = new LinkedHashSet<>();
        for (CriteriaItem item : input.items()) {
            items.add(new GradingRequest.Item(item.itemId(), item.name(), item.questionIds(), item.guide()));
            questionIds.addAll(item.questionIds());
        }

        Map<String, AnswerValue> answersById = new HashMap<>();
        for (AnswerValue answer : input.answers()) {
            answersById.putIfAbsent(answer.questionId(), answer);
        }

        List<GradingRequest.Answer> answers = new ArrayList<>();
        for (String questionId : questionIds) {
            String title = input.questionTitles().get(questionId);
            if (title == null || title.isBlank()) {
                throw new InvalidScoringInputException("FORM_QUESTION_NOT_FOUND");
            }
            answers.add(new GradingRequest.Answer(questionId, title, text(answersById.get(questionId))));
        }
        return new GradingRequest(aid, items, answers);
    }

    /** 단답 · 서술은 value, 선택형은 values를 ", "로 이어 붙인다. 답이 없으면 빈 문자열. */
    static String text(AnswerValue answer) {
        if (answer == null) {
            return "";
        }
        if (answer.value() != null) {
            return answer.value();
        }
        if (answer.values() != null && !answer.values().isEmpty()) {
            return String.join(", ", answer.values());
        }
        return "";
    }
}
