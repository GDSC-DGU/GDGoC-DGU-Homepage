package com.gdgocdgu.homepage.recruit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.common.error.CommonErrorCode;
import com.gdgocdgu.homepage.common.error.ErrorCode;
import com.gdgocdgu.homepage.recruit.SubmitResult.Rejected;
import com.gdgocdgu.homepage.recruit.SubmitResult.Submitted;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/** DB 없이 제출 순서(상태 확인 → 검증 → 저장 → 큐 등록)와 오류 변환을 확인한다. */
class ApplicationSubmitServiceTest {

    static final Instant NOW = Instant.parse("2027-02-25T05:10:00Z");
    static final ApplicationKeyGenerator KEYS = new ApplicationKeyGenerator(ApplicationKeyGeneratorTest.SECRET);

    final List<NewApplication> saved = new ArrayList<>();
    final List<String> events = new ArrayList<>();
    SubmitResult nextResult = new Submitted(2);

    ApplicationSubmitService serviceWith(Recruitment recruitment) {
        ApplicationSubmitRepository repository = application -> {
            saved.add(application);
            events.add("save");
            return nextResult;
        };
        FormVersionRepository forms = (rid, version) -> version == 3
                ? Optional.of(ApplicationValidatorTest.FORM) : Optional.empty();
        return new ApplicationSubmitService(InMemoryRecruitmentRepository.of(recruitment), forms, repository,
                (aid, criteriaVersion) -> events.add("enqueue:" + aid + ":" + criteriaVersion),
                KEYS, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    static Recruitment recruitment(boolean closedManually) {
        Recruitment base = ApplicationValidatorTest.RECRUITMENT;
        return new Recruitment(base.rid(), base.cohort(), base.title(), base.status(), closedManually,
                base.applyStartAt(), base.applyEndAt(), base.tracks(), base.noticeMarkdown(),
                base.publishedFormVersion(), null);
    }

    static void assertError(Runnable call, ErrorCode errorCode) {
        assertThatThrownBy(call::run)
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(errorCode);
    }

    static SubmitApplicationRequest withFormVersion(Integer formVersion) {
        SubmitApplicationRequest request = ApplicationValidatorTest.valid();
        return new SubmitApplicationRequest(request.applicant(), request.track(), request.answers(),
                request.privacyConsent(), formVersion);
    }

    @Test
    void 저장한_뒤_저장된_기준_버전으로_채점_작업을_한_번_등록한다() {
        ApplicationSubmitService service = serviceWith(recruitment(false));

        SubmitApplicationResponse response = service.submit("rct_5", ApplicationValidatorTest.valid());

        assertThat(response.aid()).matches("a_[0-9a-z]{12}");
        assertThat(response.submittedAt()).isEqualTo("2027-02-25T14:10:00+09:00");
        assertThat(events).containsExactly("save", "enqueue:" + response.aid() + ":2");
        NewApplication application = saved.getFirst();
        assertThat(application.aid()).isEqualTo(response.aid());
        assertThat(application.rid()).isEqualTo("rct_5");
        assertThat(application.submittedAt()).isEqualTo(NOW);
        assertThat(application.studentIdKey()).isEqualTo(ApplicationKeyGeneratorTest.KEY_OF_2023123456);
        assertThat(application.emailKey()).isEqualTo(ApplicationKeyGeneratorTest.KEY_OF_HONG_EMAIL);
    }

    @Test
    void 지원서마다_다른_aid를_만든다() {
        ApplicationSubmitService service = serviceWith(recruitment(false));

        String first = service.submit("rct_5", ApplicationValidatorTest.valid()).aid();
        String second = service.submit("rct_5", ApplicationValidatorTest.valid()).aid();

        assertThat(first).isNotEqualTo(second);
    }

    @Test
    void 접수_중이_아니거나_없는_회차는_저장하지_않고_RECRUITMENT_CLOSED다() {
        ApplicationSubmitService service = serviceWith(recruitment(true));

        assertError(() -> service.submit("rct_5", ApplicationValidatorTest.valid()), RecruitErrorCode.RECRUITMENT_CLOSED);
        assertError(() -> service.submit("rct_404", ApplicationValidatorTest.valid()),
                RecruitErrorCode.RECRUITMENT_CLOSED);
        assertThat(events).isEmpty();
    }

    @Test
    void 게시_버전과_다른_폼으로_작성했으면_FORM_CHANGED다() {
        ApplicationSubmitService service = serviceWith(recruitment(false));

        assertError(() -> service.submit("rct_5", withFormVersion(2)), RecruitErrorCode.FORM_CHANGED);
        assertThat(events).isEmpty();
    }

    @Test
    void 폼_버전이_없으면_VALIDATION_FAILED다() {
        ApplicationSubmitService service = serviceWith(recruitment(false));

        assertError(() -> service.submit("rct_5", withFormVersion(null)), CommonErrorCode.VALIDATION_FAILED);
        assertError(() -> service.submit("rct_5", null), CommonErrorCode.VALIDATION_FAILED);
        assertThat(events).isEmpty();
    }

    @Test
    void 트랜잭션에서_거절되면_그_오류를_돌려주고_큐에_등록하지_않는다() {
        ApplicationSubmitService service = serviceWith(recruitment(false));

        for (RecruitErrorCode code : List.of(RecruitErrorCode.APPLICATION_DUPLICATED,
                RecruitErrorCode.RECRUITMENT_CLOSED, RecruitErrorCode.FORM_CHANGED)) {
            nextResult = new Rejected(code);
            assertError(() -> service.submit("rct_5", ApplicationValidatorTest.valid()), code);
        }
        assertThat(events).containsOnly("save");
    }
}
