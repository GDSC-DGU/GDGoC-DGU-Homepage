package com.gdgocdgu.homepage.recruit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.common.error.CommonErrorCode;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class ApplicationCheckServiceTest {

    static final ApplicationKeyGenerator KEYS = new ApplicationKeyGenerator(ApplicationKeyGeneratorTest.SECRET);
    static final String SAVED_KEY = ApplicationKeyGeneratorTest.KEY_OF_2023123456;

    static Recruitment recruitment(RecruitmentStatus status) {
        return new Recruitment("rct_5", 5, "5기 모집", status, false, Instant.parse("2027-02-19T15:00:00Z"),
                Instant.parse("2027-03-05T14:59:59Z"), List.of("BE"), "안내", 3, null);
    }

    static ApplicationCheckService serviceWith(RecruitmentStatus status) {
        ApplicationKeyRepository applicationKeys = (rid, keyId) -> rid.equals("rct_5") && Set.of(SAVED_KEY).contains(keyId);
        return new ApplicationCheckService(InMemoryRecruitmentRepository.of(recruitment(status)), applicationKeys, KEYS);
    }

    @Test
    void 이미_지원한_학번이면_중복이다() {
        assertThat(serviceWith(RecruitmentStatus.OPEN).check("rct_5", "2023123456").duplicated()).isTrue();
    }

    @Test
    void 지원하지_않은_학번이면_중복이_아니다() {
        assertThat(serviceWith(RecruitmentStatus.OPEN).check("rct_5", "2023999999").duplicated()).isFalse();
    }

    @Test
    void 학번_앞뒤_공백은_지우고_비교한다() {
        assertThat(serviceWith(RecruitmentStatus.OPEN).check("rct_5", "  2023123456\n").duplicated()).isTrue();
    }

    @Test
    void 없는_회차는_중복이_아니다() {
        assertThat(serviceWith(RecruitmentStatus.OPEN).check("rct_404", "2023123456").duplicated()).isFalse();
    }

    @Test
    void DRAFT_회차는_키가_있어도_중복이_아니다() {
        assertThat(serviceWith(RecruitmentStatus.DRAFT).check("rct_5", "2023123456").duplicated()).isFalse();
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "   ", "202312345", "20231234567", "202312345a", "2023 23456", "٢٠٢٣١٢٣٤٥٦"})
    void 숫자_10자리가_아니면_VALIDATION_FAILED다(String studentId) {
        ApplicationCheckService service = serviceWith(RecruitmentStatus.OPEN);

        assertThatThrownBy(() -> service.check("rct_5", studentId))
                .isInstanceOf(ApiException.class)
                .hasMessage("학번 형식이 올바르지 않습니다.")
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(CommonErrorCode.VALIDATION_FAILED);
    }
}
