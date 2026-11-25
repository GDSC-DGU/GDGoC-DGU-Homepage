package com.gdgocdgu.homepage.recruit;

import java.util.List;

/** 검증을 통과한 답변 하나. {@code value}와 {@code values} 중 하나만 있다. */
public record SubmittedAnswer(String questionId, String value, List<String> values) {

    public SubmittedAnswer {
        values = values == null ? null : List.copyOf(values);
    }
}
