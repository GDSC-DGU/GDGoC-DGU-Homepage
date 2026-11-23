package com.gdgocdgu.homepage.recruit.scoring;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * AI 채점 서버 호출 설정 (application-{profile}.yml 의 app.scoring.ai). 값은 비밀이 아니다(URL).
 *
 * @param baseUrl        AI 서버 주소. 비어 있으면 앱이 시작되지 않는다. id-token 인증의 audience이기도 하다
 * @param auth           {@code id-token}(기본, Google ID 토큰을 붙임. dev · prod) 또는 {@code none}(local)
 * @param connectTimeout 연결 제한 시간. 기본 5초
 * @param readTimeout    응답 대기 제한 시간. 기본 90초
 *                       (시간 제한 사슬: AI 90초 &lt; backend 120초 &lt; Cloud Run 180초 &lt; Cloud Tasks 240초)
 */
@ConfigurationProperties("app.scoring.ai")
public record ScoringAiProperties(
        String baseUrl,
        @DefaultValue("id-token") Auth auth,
        @DefaultValue("5s") Duration connectTimeout,
        @DefaultValue("90s") Duration readTimeout) {

    public enum Auth {
        ID_TOKEN,
        NONE
    }

    public ScoringAiProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new IllegalStateException("app.scoring.ai.base-url 이 비어 있습니다.");
        }
        if (connectTimeout == null || connectTimeout.isZero() || connectTimeout.isNegative()
                || readTimeout == null || readTimeout.isZero() || readTimeout.isNegative()) {
            throw new IllegalStateException("app.scoring.ai.connect-timeout, read-timeout 은 0보다 커야 합니다.");
        }
    }
}
