package com.gdgocdgu.homepage.recruit.scoring;

import com.gdgocdgu.homepage.recruit.scoring.GradingClient.GradingRequest;

/**
 * AI 서버가 받는 채점 요청의 크기 제한. <b>ai/app/grading/schemas.py의 Field 제한과 같아야 한다.</b>
 * 어느 쪽을 바꾸면 반드시 다른 쪽도 바꾼다. 넘는 요청은 AI가 422로 거절하고 재시도해도 같으므로,
 * 호출 전에 확인해 FAILED({@code GRADING_INPUT_TOO_LARGE})로 저장한다.
 * 길이는 파이썬 {@code len}과 같게 유니코드 코드 포인트 수로 센다.
 */
final class GradingLimits {

    static final String ERROR_CODE = "GRADING_INPUT_TOO_LARGE";

    static final int APPLICATION_ID_MIN = 1;
    static final int APPLICATION_ID_MAX = 100;
    static final int ITEMS_MIN = 1;
    static final int ITEMS_MAX = 20;
    static final int ANSWERS_MIN = 1;
    static final int ANSWERS_MAX = 10;

    static final int ITEM_ID_MIN = 1;
    static final int ITEM_ID_MAX = 100;
    static final int ITEM_NAME_MIN = 1;
    static final int ITEM_NAME_MAX = 100;
    static final int ITEM_QUESTION_IDS_MIN = 1;
    static final int ITEM_QUESTION_IDS_MAX = 10;
    static final int ITEM_GUIDE_MIN = 1;
    static final int ITEM_GUIDE_MAX = 2000;

    static final int QUESTION_ID_MIN = 1;
    static final int QUESTION_ID_MAX = 100;
    static final int QUESTION_MIN = 1;
    static final int QUESTION_MAX = 1000;
    static final int ANSWER_TEXT_MIN = 0;
    static final int ANSWER_TEXT_MAX = 5000;

    private GradingLimits() {
    }

    /** 제한을 넘으면 어떤 제한인지(내용 없이)를 담은 {@link InvalidScoringInputException}을 던진다. */
    static void check(GradingRequest request) {
        text("applicationId", request.applicationId(), APPLICATION_ID_MIN, APPLICATION_ID_MAX);
        count("items", request.items().size(), ITEMS_MIN, ITEMS_MAX);
        count("answers", request.answers().size(), ANSWERS_MIN, ANSWERS_MAX);
        for (GradingRequest.Item item : request.items()) {
            text("items.itemId", item.itemId(), ITEM_ID_MIN, ITEM_ID_MAX);
            text("items.name", item.name(), ITEM_NAME_MIN, ITEM_NAME_MAX);
            count("items.questionIds", item.questionIds().size(), ITEM_QUESTION_IDS_MIN, ITEM_QUESTION_IDS_MAX);
            for (String questionId : item.questionIds()) {
                text("items.questionIds[]", questionId, QUESTION_ID_MIN, QUESTION_ID_MAX);
            }
            text("items.guide", item.guide(), ITEM_GUIDE_MIN, ITEM_GUIDE_MAX);
        }
        for (GradingRequest.Answer answer : request.answers()) {
            text("answers.questionId", answer.questionId(), QUESTION_ID_MIN, QUESTION_ID_MAX);
            text("answers.question", answer.question(), QUESTION_MIN, QUESTION_MAX);
            text("answers.text", answer.text(), ANSWER_TEXT_MIN, ANSWER_TEXT_MAX);
        }
    }

    private static void count(String field, int size, int min, int max) {
        if (size < min || size > max) {
            throw tooLarge(field, size, min, max);
        }
    }

    private static void text(String field, String value, int min, int max) {
        int length = value == null ? 0 : value.codePointCount(0, value.length());
        if (length < min || length > max) {
            throw tooLarge(field, length, min, max);
        }
    }

    private static InvalidScoringInputException tooLarge(String field, int actual, int min, int max) {
        return new InvalidScoringInputException(
                ERROR_CODE, "limit=" + field + ", actual=" + actual + ", allowed=" + min + ".." + max);
    }
}
