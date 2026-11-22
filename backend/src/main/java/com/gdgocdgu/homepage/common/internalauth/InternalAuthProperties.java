package com.gdgocdgu.homepage.common.internalauth;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * {@code /internal/**} 인증 설정 (application-{profile}.yml 의 app.internal-auth). 값은 비밀이 아니다.
 *
 * <p>{@code mode}가 {@code oidc}(기본, 값이 없을 때도)인데 audience나 허용 목록이 비어 있으면 앱이 시작되지 않는다.
 * 인증 없이 내부 API가 열린 채로 운영되는 일을 막기 위해서다. {@code disabled}는 local에서만 쓴다.
 *
 * @param mode                  {@code oidc}(Google OIDC ID 토큰 검증) 또는 {@code disabled}(검증 안 함, local 전용)
 * @param audience              토큰의 audience로 기대하는 backend 주소 (끝의 / 는 없어도 됨)
 * @param allowedServiceAccounts 호출을 허용할 서비스 계정 이메일 목록 (tasks-invoker)
 */
@ConfigurationProperties("app.internal-auth")
public record InternalAuthProperties(
        @DefaultValue("oidc") Mode mode,
        String audience,
        List<String> allowedServiceAccounts) {

    public enum Mode {
        OIDC,
        DISABLED
    }

    public InternalAuthProperties {
        allowedServiceAccounts = allowedServiceAccounts == null ? List.of()
                : allowedServiceAccounts.stream().filter(s -> s != null && !s.isBlank()).map(String::trim).toList();
        if (mode == Mode.OIDC) {
            List<String> missing = new ArrayList<>();
            if (audience == null || audience.isBlank()) missing.add("audience");
            if (allowedServiceAccounts.isEmpty()) missing.add("allowed-service-accounts");
            if (!missing.isEmpty()) {
                throw new IllegalStateException(
                        "app.internal-auth.mode=oidc 인데 필수 설정이 비어 있습니다: " + String.join(", ", missing));
            }
        }
    }
}
