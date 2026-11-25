package com.gdgocdgu.homepage.recruit;

import java.util.List;

/** 지원폼 문항. 필드 이름과 순서는 API-RCT-002 응답과 같다. */
public record FormQuestion(
        String questionId,
        QuestionType type,
        String title,
        String description,
        boolean required,
        Integer maxLength,
        List<String> options,
        List<String> trackOnly) {

    public FormQuestion {
        options = options == null ? List.of() : List.copyOf(options);
        trackOnly = trackOnly == null ? List.of() : List.copyOf(trackOnly);
    }
}
