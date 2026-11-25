package com.gdgocdgu.homepage.recruit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.gdgocdgu.homepage.common.error.ApiException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/** DB 없이 공개 지원폼을 고르는 규칙만 확인한다. */
class ApplicationFormServiceTest {

    static final Instant START = Instant.parse("2027-02-19T15:00:00Z");
    static final Instant END = Instant.parse("2027-03-05T14:59:59Z");

    static Recruitment recruitment(RecruitmentStatus status, Integer publishedFormVersion) {
        return new Recruitment("rct_5", 5, "5기 모집", status, false, START, END,
                List.of("BE"), "안내", publishedFormVersion, null);
    }

    static ApplicationForm form(int version, String questionId) {
        return new ApplicationForm(version, List.of(new FormQuestion(questionId, QuestionType.SHORT_TEXT,
                "제목", null, true, 100, List.of(), List.of())));
    }

    static ApplicationFormService serviceWith(Recruitment recruitment, Map<Integer, ApplicationForm> forms) {
        FormVersionRepository formVersions = (rid, version) -> Optional.ofNullable(forms.get(version));
        return new ApplicationFormService(InMemoryRecruitmentRepository.of(recruitment), formVersions);
    }

    static void assertFormNotPublished(ApplicationFormService service, String rid) {
        assertThatThrownBy(() -> service.getPublishedForm(rid))
                .isInstanceOf(ApiException.class)
                .hasMessage("게시된 지원폼이 없습니다.")
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(RecruitErrorCode.FORM_NOT_PUBLISHED);
    }

    @Test
    void 최신_초안이_아니라_게시된_버전의_문항을_돌려준다() {
        ApplicationFormService service = serviceWith(recruitment(RecruitmentStatus.OPEN, 3),
                Map.of(3, form(3, "published"), 4, form(4, "draft")));

        ApplicationFormResponse response = service.getPublishedForm("rct_5");

        assertThat(response.rid()).isEqualTo("rct_5");
        assertThat(response.formVersion()).isEqualTo(3);
        assertThat(response.questions()).extracting(FormQuestion::questionId).containsExactly("published");
    }

    @Test
    void 없는_회차면_FORM_NOT_PUBLISHED다() {
        ApplicationFormService service = serviceWith(recruitment(RecruitmentStatus.OPEN, 3), Map.of(3, form(3, "q1")));

        assertFormNotPublished(service, "rct_404");
    }

    @Test
    void DRAFT_회차는_폼_버전이_있어도_FORM_NOT_PUBLISHED다() {
        ApplicationFormService service = serviceWith(recruitment(RecruitmentStatus.DRAFT, 3), Map.of(3, form(3, "q1")));

        assertFormNotPublished(service, "rct_5");
    }

    @Test
    void 게시된_폼_버전이_없으면_FORM_NOT_PUBLISHED다() {
        ApplicationFormService service = serviceWith(recruitment(RecruitmentStatus.SCHEDULED, null), Map.of());

        assertFormNotPublished(service, "rct_5");
    }

    @Test
    void 게시_버전이_가리키는_문서가_없으면_데이터_오류로_처리한다() {
        ApplicationFormService service = serviceWith(recruitment(RecruitmentStatus.OPEN, 3), Map.of());

        assertThatThrownBy(() -> service.getPublishedForm("rct_5"))
                .isInstanceOf(IllegalStateException.class);
    }
}
