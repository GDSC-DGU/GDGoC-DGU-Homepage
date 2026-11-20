package com.gdgocdgu.homepage.common.firestore;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Firestore 연결 설정 (application-{profile}.yml 의 app.firestore).
 *
 * @param projectId    GCP 프로젝트 ID. local은 에뮬레이터 전용 demo-gdgoc
 * @param emulatorHost 에뮬레이터 주소(host:port). 비어 있으면 실제 Firestore에 ADC로 연결한다
 */
@Validated
@ConfigurationProperties("app.firestore")
public record FirestoreProperties(@NotBlank String projectId, String emulatorHost) {

    public boolean usesEmulator() {
        return emulatorHost != null && !emulatorHost.isBlank();
    }
}
