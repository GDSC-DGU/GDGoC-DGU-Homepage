package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.common.error.CommonErrorCode;
import com.gdgocdgu.homepage.recruit.SubmitApplicationRequest.AnswerRequest;
import com.gdgocdgu.homepage.recruit.SubmitApplicationRequest.ApplicantRequest;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * API-RCT-005 제출 내용 검증. 게시된 폼의 문항 규칙(RCT-002)과 같은 기준으로 본다.
 * 어떤 값이 틀렸는지는 응답과 예외 메시지에 넣지 않는다(지원자 입력이 섞이지 않게).
 */
final class ApplicationValidator {

    static final String MESSAGE = "입력 값을 확인해주세요.";

    private static final int NAME_MAX_LENGTH = 50;
    private static final int MAJOR_MAX_LENGTH = 50;
    private static final int PHONE_MAX_LENGTH = 20;

    private ApplicationValidator() {
    }

    static ApiException invalid() {
        return new ApiException(CommonErrorCode.VALIDATION_FAILED, MESSAGE);
    }

    static ApplicationSubmission validate(SubmitApplicationRequest request, Recruitment recruitment,
            ApplicationForm form) {
        if (request == null || request.applicant() == null || request.formVersion() == null
                || !Boolean.TRUE.equals(request.privacyConsent())) {
            throw invalid();
        }
        ApplicantRequest applicant = request.applicant();
        String name = requiredText(applicant.name(), NAME_MAX_LENGTH);
        String major = requiredText(applicant.major(), MAJOR_MAX_LENGTH);
        String phone = requiredText(applicant.phone(), PHONE_MAX_LENGTH);
        String studentId = ApplicantNormalizer.studentId(applicant.studentId());
        String email = ApplicantNormalizer.email(applicant.email());
        if (studentId == null || email == null) {
            throw invalid();
        }
        String track = request.track();
        if (track == null || !recruitment.tracks().contains(track)) {
            throw invalid();
        }
        return new ApplicationSubmission(name, studentId, major, email, phone, track,
                validateAnswers(request.answers(), form, track), request.formVersion());
    }

    private static List<SubmittedAnswer> validateAnswers(List<AnswerRequest> raw, ApplicationForm form, String track) {
        Map<String, FormQuestion> questions = new HashMap<>();
        for (FormQuestion question : form.questions()) {
            questions.put(question.questionId(), question);
        }
        Map<String, AnswerRequest> answersById = new HashMap<>();
        for (AnswerRequest answer : raw == null ? List.<AnswerRequest>of() : raw) {
            if (answer == null || !questions.containsKey(answer.questionId())
                    || answersById.put(answer.questionId(), answer) != null) {
                throw invalid();
            }
        }

        List<SubmittedAnswer> answers = new ArrayList<>();
        for (FormQuestion question : form.questions()) {
            AnswerRequest answer = answersById.get(question.questionId());
            boolean applies = question.trackOnly().isEmpty() || question.trackOnly().contains(track);
            if (!applies) {
                if (answer != null && !isEmpty(answer)) {
                    throw invalid();
                }
                continue;
            }
            SubmittedAnswer submitted = answer == null || isEmpty(answer) ? null : toAnswer(question, answer);
            if (submitted == null) {
                if (question.required()) {
                    throw invalid();
                }
                continue;
            }
            answers.add(submitted);
        }
        return answers;
    }

    private static boolean isEmpty(AnswerRequest answer) {
        return (answer.value() == null || answer.value().isBlank())
                && (answer.values() == null || answer.values().isEmpty());
    }

    private static SubmittedAnswer toAnswer(FormQuestion question, AnswerRequest answer) {
        String id = question.questionId();
        if (question.type() == QuestionType.MULTI_CHOICE) {
            if (answer.value() != null || answer.values() == null
                    || new HashSet<>(answer.values()).size() != answer.values().size()
                    || !question.options().containsAll(answer.values())) {
                throw invalid();
            }
            return new SubmittedAnswer(id, null, answer.values());
        }
        if (answer.values() != null) {
            throw invalid();
        }
        String value = answer.value();
        switch (question.type()) {
            case SINGLE_CHOICE -> {
                if (!question.options().contains(value)) {
                    throw invalid();
                }
            }
            case URL -> {
                value = value.strip();
                if (tooLong(value, question) || !isHttpUrl(value)) {
                    throw invalid();
                }
            }
            default -> {
                if (tooLong(value, question)) {
                    throw invalid();
                }
            }
        }
        return new SubmittedAnswer(id, value, null);
    }

    /** 문항의 maxLength와 타입별 상한 중 작은 값. 글자 수는 코드 포인트로 센다(이모지 1자). */
    private static boolean tooLong(String value, FormQuestion question) {
        int cap = switch (question.type()) {
            case SHORT_TEXT -> 100;
            case LONG_TEXT -> 1000;
            default -> 2048;
        };
        int limit = question.maxLength() == null ? cap : Math.min(question.maxLength(), cap);
        return value.codePointCount(0, value.length()) > limit;
    }

    private static boolean isHttpUrl(String value) {
        try {
            URI uri = new URI(value);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            return (scheme.equals("http") || scheme.equals("https"))
                    && uri.getHost() != null && !uri.getHost().isBlank();
        } catch (URISyntaxException e) {
            return false;
        }
    }

    private static String requiredText(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            throw invalid();
        }
        String stripped = value.strip();
        if (stripped.codePointCount(0, stripped.length()) > maxLength) {
            throw invalid();
        }
        return stripped;
    }
}
