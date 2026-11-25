package com.gdgocdgu.homepage.recruit;

import java.util.List;

/** API-RCT-005 요청 본문. 형식 검사는 게시된 폼이 필요해 {@link ApplicationValidator}에서 한다. */
public record SubmitApplicationRequest(
        ApplicantRequest applicant,
        String track,
        List<AnswerRequest> answers,
        Boolean privacyConsent,
        Integer formVersion) {

    public record ApplicantRequest(String name, String studentId, String major, String email, String phone) {
    }

    /** 단일 · 주관식 · URL 문항은 {@code value}, 복수 선택은 {@code values}. */
    public record AnswerRequest(String questionId, String value, List<String> values) {
    }
}
