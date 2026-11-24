package com.gdgocdgu.homepage.common.runtime;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class CloudRunProfileGuardTest {

    @Test
    void Cloud_Run이_아니면_프로필과_무관하게_통과한다() {
        assertThatCode(() -> CloudRunProfileGuard.check(null, new String[0])).doesNotThrowAnyException();
        assertThatCode(() -> CloudRunProfileGuard.check(" ", new String[] {"local"})).doesNotThrowAnyException();
    }

    @Test
    void Cloud_Run에서_프로필이_없으면_실패한다() {
        assertThatThrownBy(() -> CloudRunProfileGuard.check("backend", new String[0]))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SPRING_PROFILES_ACTIVE");
    }

    @Test
    void Cloud_Run에서_local이면_실패한다() {
        assertThatThrownBy(() -> CloudRunProfileGuard.check("backend", new String[] {"local"}))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void Cloud_Run에서_dev_또는_prod면_통과한다() {
        assertThatCode(() -> CloudRunProfileGuard.check("backend", new String[] {"dev"})).doesNotThrowAnyException();
        assertThatCode(() -> CloudRunProfileGuard.check("backend", new String[] {"prod"})).doesNotThrowAnyException();
    }
}
