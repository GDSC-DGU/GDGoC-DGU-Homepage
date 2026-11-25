package com.gdgocdgu.homepage.recruit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.common.error.CommonErrorCode;
import com.gdgocdgu.homepage.recruit.SubmitApplicationRequest.AnswerRequest;
import com.gdgocdgu.homepage.recruit.SubmitApplicationRequest.ApplicantRequest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.function.UnaryOperator;
import org.junit.jupiter.api.Test;

/** DB 없이 제출 내용 검증 규칙만 확인한다 (API-RCT-005 400). */
class ApplicationValidatorTest {

    static final Recruitment RECRUITMENT = new Recruitment("rct_5", 5, "5기 모집", RecruitmentStatus.OPEN, false,
            Instant.parse("2027-02-19T15:00:00Z"), Instant.parse("2027-03-05T14:59:59Z"),
            List.of("BE", "FE"), "안내", 3, null);

    static final ApplicationForm FORM = new ApplicationForm(3, List.of(
            new FormQuestion("q1", QuestionType.LONG_TEXT, "지원 동기", null, true, 10, List.of(), List.of()),
            new FormQuestion("q2", QuestionType.URL, "포트폴리오", null, false, null, List.of(), List.of()),
            new FormQuestion("q3", QuestionType.SINGLE_CHOICE, "학년", null, true, null, List.of("A", "B"), List.of()),
            new FormQuestion("q4", QuestionType.MULTI_CHOICE, "관심 분야", null, false, null,
                    List.of("X", "Y", "Z"), List.of()),
            new FormQuestion("q5", QuestionType.SHORT_TEXT, "FE 전용", null, true, null, List.of(), List.of("FE"))));

    static SubmitApplicationRequest valid() {
        return new SubmitApplicationRequest(
                new ApplicantRequest("홍길동", " 2023123456 ", "컴퓨터AI학부", " Hong@DGU.ac.kr ", "010-0000-0000"),
                "BE",
                List.of(new AnswerRequest("q1", "지원 동기 답변", null),
                        new AnswerRequest("q2", " https://github.com/hong ", null),
                        new AnswerRequest("q3", "A", null),
                        new AnswerRequest("q4", null, List.of("X", "Z"))),
                true, 3);
    }

    static SubmitApplicationRequest withAnswers(SubmitApplicationRequest request, List<AnswerRequest> answers) {
        return new SubmitApplicationRequest(request.applicant(), request.track(), answers,
                request.privacyConsent(), request.formVersion());
    }

    /** 기본 답변 중 questionId가 같은 것을 바꾸거나(null이면 뺀다), 없으면 덧붙인다. */
    static SubmitApplicationRequest replaceAnswer(String questionId, AnswerRequest replacement) {
        List<AnswerRequest> answers = new ArrayList<>();
        boolean replaced = false;
        for (AnswerRequest answer : valid().answers()) {
            if (answer.questionId().equals(questionId)) {
                replaced = true;
                if (replacement != null) {
                    answers.add(replacement);
                }
            } else {
                answers.add(answer);
            }
        }
        if (!replaced && replacement != null) {
            answers.add(replacement);
        }
        return withAnswers(valid(), answers);
    }

    static SubmitApplicationRequest withApplicant(UnaryOperator<ApplicantRequest> change) {
        SubmitApplicationRequest request = valid();
        return new SubmitApplicationRequest(change.apply(request.applicant()), request.track(), request.answers(),
                request.privacyConsent(), request.formVersion());
    }

    static void assertInvalid(SubmitApplicationRequest request) {
        assertThatThrownBy(() -> ApplicationValidator.validate(request, RECRUITMENT, FORM))
                .isInstanceOf(ApiException.class)
                .hasMessage("입력 값을 확인해주세요.")
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(CommonErrorCode.VALIDATION_FAILED);
    }

    @Test
    void 올바른_제출은_학번과_이메일을_정규화해_돌려준다() {
        ApplicationSubmission submission = ApplicationValidator.validate(valid(), RECRUITMENT, FORM);

        assertThat(submission.studentId()).isEqualTo("2023123456");
        assertThat(submission.email()).isEqualTo("hong@dgu.ac.kr");
        assertThat(submission.track()).isEqualTo("BE");
        assertThat(submission.formVersion()).isEqualTo(3);
        assertThat(submission.answers()).containsExactly(
                new SubmittedAnswer("q1", "지원 동기 답변", null),
                new SubmittedAnswer("q2", "https://github.com/hong", null),
                new SubmittedAnswer("q3", "A", null),
                new SubmittedAnswer("q4", null, List.of("X", "Z")));
    }

    @Test
    void 비어_있는_선택_문항_답변은_저장하지_않는다() {
        SubmitApplicationRequest request = withAnswers(valid(), List.of(
                new AnswerRequest("q1", "답변", null),
                new AnswerRequest("q2", "  ", null),
                new AnswerRequest("q3", "B", null),
                new AnswerRequest("q4", null, List.of())));

        assertThat(ApplicationValidator.validate(request, RECRUITMENT, FORM).answers())
                .extracting(SubmittedAnswer::questionId).containsExactly("q1", "q3");
    }

    @Test
    void 글자_수는_maxLength까지_허용하고_이모지는_한_글자로_센다() {
        assertThat(ApplicationValidator.validate(replaceAnswer("q1", new AnswerRequest("q1", "😀".repeat(10), null)),
                RECRUITMENT, FORM)).isNotNull();
        assertInvalid(replaceAnswer("q1", new AnswerRequest("q1", "가".repeat(11), null)));
    }

    @Test
    void 트랙_전용_필수_문항은_그_트랙만_답해야_한다() {
        SubmitApplicationRequest fe = new SubmitApplicationRequest(valid().applicant(), "FE",
                valid().answers(), true, 3);
        assertInvalid(fe);

        assertInvalid(replaceAnswer("q5", new AnswerRequest("q5", "BE가 답한 FE 문항", null)));
    }

    @Test
    void 필수_문항이_없거나_비어_있으면_실패한다() {
        assertInvalid(replaceAnswer("q1", null));
        assertInvalid(replaceAnswer("q1", new AnswerRequest("q1", "   ", null)));
    }

    @Test
    void 없는_문항이나_같은_문항_두_번은_실패한다() {
        assertInvalid(replaceAnswer("q9", new AnswerRequest("q9", "x", null)));
        List<AnswerRequest> twice = new ArrayList<>(valid().answers());
        twice.add(new AnswerRequest("q1", "또", null));
        assertInvalid(withAnswers(valid(), twice));
    }

    @Test
    void URL은_http_https와_호스트가_있어야_한다() {
        assertInvalid(replaceAnswer("q2", new AnswerRequest("q2", "ftp://github.com/hong", null)));
        assertInvalid(replaceAnswer("q2", new AnswerRequest("q2", "javascript:alert(1)", null)));
        assertInvalid(replaceAnswer("q2", new AnswerRequest("q2", "https://", null)));
        assertInvalid(replaceAnswer("q2", new AnswerRequest("q2", "https://" + "a".repeat(2048), null)));
    }

    @Test
    void 선택지_문항은_선택지_안의_값만_받는다() {
        assertInvalid(replaceAnswer("q3", new AnswerRequest("q3", "C", null)));
        assertInvalid(replaceAnswer("q3", new AnswerRequest("q3", null, List.of("A"))));
        assertInvalid(replaceAnswer("q4", new AnswerRequest("q4", null, List.of("X", "W"))));
        assertInvalid(replaceAnswer("q4", new AnswerRequest("q4", null, List.of("X", "X"))));
        assertInvalid(replaceAnswer("q4", new AnswerRequest("q4", "X", null)));
    }

    @Test
    void 모집에_없는_트랙이나_개인정보_미동의는_실패한다() {
        SubmitApplicationRequest request = valid();
        assertInvalid(new SubmitApplicationRequest(request.applicant(), "Design", request.answers(), true, 3));
        assertInvalid(new SubmitApplicationRequest(request.applicant(), "BE", request.answers(), false, 3));
        assertInvalid(new SubmitApplicationRequest(request.applicant(), "BE", request.answers(), null, 3));
    }

    @Test
    void 지원자_정보_형식이_틀리면_실패한다() {
        assertInvalid(withApplicant(a -> new ApplicantRequest(" ", a.studentId(), a.major(), a.email(), a.phone())));
        assertInvalid(withApplicant(a -> new ApplicantRequest(a.name(), "12345", a.major(), a.email(), a.phone())));
        assertInvalid(withApplicant(a -> new ApplicantRequest(a.name(), a.studentId(), a.major(), "hong", a.phone())));
        assertInvalid(withApplicant(a -> new ApplicantRequest(a.name(), a.studentId(), null, a.email(), a.phone())));
        assertInvalid(withApplicant(a -> new ApplicantRequest(a.name(), a.studentId(), a.major(), a.email(), "")));
        assertInvalid(new SubmitApplicationRequest(null, "BE", valid().answers(), true, 3));
    }
}
