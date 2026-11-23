package com.gdgocdgu.homepage.common.internalauth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

class InternalAuthPropertiesTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withBean(ObjectMapper.class, () -> JsonMapper.builder().build())
            .withUserConfiguration(InternalAuthConfig.class);

    @Test
    void 설정이_없으면_기본_oidc라서_시작에_실패하고_빠진_키를_알려준다() {
        runner.run(context -> {
            assertThat(context).hasFailed();
            assertThat(context.getStartupFailure()).rootCause()
                    .hasMessageContaining("audience")
                    .hasMessageContaining("allowed-service-accounts");
        });
    }

    @Test
    void 허용_목록만_비어_있어도_실패한다() {
        runner.withPropertyValues("app.internal-auth.audience=https://backend.example.test").run(context -> {
            assertThat(context).hasFailed();
            assertThat(context.getStartupFailure()).rootCause()
                    .hasMessageContaining("allowed-service-accounts").hasMessageNotContaining("audience,");
        });
    }

    @Test
    void oidc에_값이_모두_있으면_필터가_만들어진다() {
        runner.withPropertyValues(
                "app.internal-auth.mode=oidc",
                "app.internal-auth.audience=https://backend.example.test",
                "app.internal-auth.allowed-service-accounts[0]=tasks-invoker@example.iam.gserviceaccount.com")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(FilterRegistrationBean.class);
                    // 필터 자체는 빈이 아니어야 /* 에 자동 등록되지 않는다.
                    assertThat(context).doesNotHaveBean(InternalAuthFilter.class);
                    FilterRegistrationBean<?> registration = context.getBean(FilterRegistrationBean.class);
                    assertThat(registration.isEnabled()).isTrue();
                    assertThat(registration.getUrlPatterns()).containsExactly("/internal/*");
                });
    }

    @Test
    void disabled는_값_없이도_시작된다() {
        runner.withPropertyValues("app.internal-auth.mode=disabled").run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).doesNotHaveBean(InternalAuthFilter.class);
            assertThat(context.getBean(FilterRegistrationBean.class).isEnabled()).isFalse();
        });
    }

    @Test
    void 알_수_없는_mode면_시작에_실패한다() {
        runner.withPropertyValues("app.internal-auth.mode=none").run(context -> assertThat(context).hasFailed());
    }
}
