package com.gdgocdgu.homepage.recruit;

import java.util.List;

/** 검증과 정규화를 마친 제출 내용. 학번 · 이메일은 정규화된 값이다. */
public record ApplicationSubmission(
        String name,
        String studentId,
        String major,
        String email,
        String phone,
        String track,
        List<SubmittedAnswer> answers,
        int formVersion) {

    public ApplicationSubmission {
        answers = List.copyOf(answers);
    }
}
