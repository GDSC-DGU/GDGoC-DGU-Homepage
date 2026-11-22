package com.gdgocdgu.homepage.recruit.scoring;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

class ScoringAiConfigTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withBean(ObjectMapper.class, () -> JsonMapper.builder().build())
            .withUserConfiguration(ScoringAiConfig.class);

    @Test
    void base_url이_있으면_기본값과_함께_GradingClient가_만들어진다() {
        runner.withPropertyValues("app.scoring.ai.base-url=http://localhost:8000", "app.scoring.ai.auth=none")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(GradingClient.class);
                    ScoringAiProperties properties = context.getBean(ScoringAiProperties.class);
                    assertThat(properties.readTimeout().toSeconds()).isEqualTo(90);
                    assertThat(properties.connectTimeout().toSeconds()).isEqualTo(5);
                });
    }

    @Test
    void auth를_생략하면_id_token이_기본이다() {
        runner.withPropertyValues("app.scoring.ai.base-url=https://ai.example.test").run(context ->
                assertThat(context.getBean(ScoringAiProperties.class).auth())
                        .isEqualTo(ScoringAiProperties.Auth.ID_TOKEN));
    }

    @Test
    void base_url이_비어_있으면_시작에_실패한다() {
        runner.withPropertyValues("app.scoring.ai.base-url= ").run(context -> {
            assertThat(context).hasFailed();
            assertThat(context.getStartupFailure()).rootCause().hasMessageContaining("base-url");
        });
        runner.run(context -> assertThat(context).hasFailed());
    }
}
