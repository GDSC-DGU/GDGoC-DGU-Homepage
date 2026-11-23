package com.gdgocdgu.homepage.common.internalauth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.ObjectMapper;

/**
 * {@code /internal/**} 인증 필터를 등록한다. 설정은 {@link InternalAuthProperties}.
 *
 * <p>필터 자체는 빈으로 노출하지 않는다. {@code Filter} 빈은 Spring Boot가 {@code /*}에 자동 등록하므로,
 * {@link FilterRegistrationBean}만 빈으로 두고 URL 패턴 {@code /internal/*}로 등록한다.
 * 서블릿 컨테이너가 디코딩 · 경로 매개변수 제거 · 점 구간 처리를 한 경로로 매칭하므로
 * {@code /%69nternal/..}, {@code /internal;x=1/..} 같은 변형도 필터를 거친다.
 */
@Configuration
@EnableConfigurationProperties(InternalAuthProperties.class)
public class InternalAuthConfig {

    private static final Logger log = LoggerFactory.getLogger(InternalAuthConfig.class);

    @Bean
    InternalTokenVerifier internalTokenVerifier(InternalAuthProperties properties) {
        if (properties.mode() == InternalAuthProperties.Mode.DISABLED) {
            return token -> false;
        }
        return new GoogleOidcTokenVerifier(properties.audience(), properties.allowedServiceAccounts());
    }

    @Bean
    FilterRegistrationBean<InternalAuthFilter> internalAuthFilterRegistration(
            InternalAuthProperties properties, InternalTokenVerifier verifier, ObjectMapper objectMapper) {
        FilterRegistrationBean<InternalAuthFilter> registration =
                new FilterRegistrationBean<>(new InternalAuthFilter(verifier, objectMapper));
        registration.addUrlPatterns("/internal/*");
        registration.setName("internalAuthFilter");
        if (properties.mode() == InternalAuthProperties.Mode.DISABLED) {
            log.warn("app.internal-auth.mode=disabled: /internal/** 인증을 하지 않습니다. local에서만 사용하세요.");
            registration.setEnabled(false);
        } else {
            log.info("/internal/** 인증: OIDC (허용 서비스 계정 {}개)", properties.allowedServiceAccounts().size());
        }
        return registration;
    }
}
