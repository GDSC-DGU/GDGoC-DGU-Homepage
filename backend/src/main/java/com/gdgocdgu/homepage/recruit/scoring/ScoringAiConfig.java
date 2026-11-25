package com.gdgocdgu.homepage.recruit.scoring;

import java.net.http.HttpClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

/** AI 채점 서버 클라이언트({@link GradingClient})를 만든다. 설정은 {@link ScoringAiProperties}. */
@Configuration
@EnableConfigurationProperties(ScoringAiProperties.class)
public class ScoringAiConfig {

    private static final Logger log = LoggerFactory.getLogger(ScoringAiConfig.class);

    @Bean
    GradingClient gradingClient(ScoringAiProperties properties, ObjectMapper objectMapper) {
        String baseUrl = stripTrailingSlash(properties.baseUrl());

        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(properties.connectTimeout())
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(properties.readTimeout());
        RestClient restClient = RestClient.builder().baseUrl(baseUrl).requestFactory(requestFactory).build();

        IdTokenSupplier tokenSupplier = properties.auth() == ScoringAiProperties.Auth.ID_TOKEN
                ? IdTokenSupplier.applicationDefault(baseUrl)
                : null;
        log.info("AI 채점 서버: {} (auth {}, read-timeout {})", baseUrl, properties.auth(), properties.readTimeout());
        return new RestGradingClient(restClient, tokenSupplier, objectMapper);
    }

    private static String stripTrailingSlash(String url) {
        String trimmed = url.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }
}
