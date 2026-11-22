package com.gdgocdgu.homepage.common.internalauth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.ObjectMapper;

/** {@code /internal/**} 인증 필터를 등록한다. 설정은 {@link InternalAuthProperties}. */
@Configuration
@EnableConfigurationProperties(InternalAuthProperties.class)
public class InternalAuthConfig {

    private static final Logger log = LoggerFactory.getLogger(InternalAuthConfig.class);

    @Bean
    InternalAuthFilter internalAuthFilter(InternalAuthProperties properties, ObjectMapper objectMapper) {
        if (properties.mode() == InternalAuthProperties.Mode.DISABLED) {
            log.warn("app.internal-auth.mode=disabled: /internal/** 인증을 하지 않습니다. local에서만 사용하세요.");
            return new InternalAuthFilter(token -> false, true, objectMapper);
        }
        log.info("/internal/** 인증: OIDC (허용 서비스 계정 {}개)", properties.allowedServiceAccounts().size());
        return new InternalAuthFilter(
                new GoogleOidcTokenVerifier(properties.audience(), properties.allowedServiceAccounts()),
                false, objectMapper);
    }
}
