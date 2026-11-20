package com.gdgocdgu.homepage.common.firestore;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.FirestoreOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Firestore 클라이언트를 하나 만들어 repository들이 함께 쓰게 한다.
 * - local: 에뮬레이터에 연결한다. 인증 정보가 필요 없다.
 * - dev · prod: Cloud Run 서비스 계정(Application Default Credentials)으로 연결한다. 키 파일을 쓰지 않는다.
 * 클라이언트는 첫 요청 때 연결하므로, 에뮬레이터가 꺼져 있어도 앱 시작은 막지 않는다.
 * 종료 시 Spring이 close()를 불러 연결을 정리한다.
 */
@Configuration
@EnableConfigurationProperties(FirestoreProperties.class)
public class FirestoreConfig {

    private static final Logger log = LoggerFactory.getLogger(FirestoreConfig.class);

    @Bean
    Firestore firestore(FirestoreProperties properties) {
        FirestoreOptions.Builder builder = FirestoreOptions.newBuilder()
                .setProjectId(properties.projectId());

        if (properties.usesEmulator()) {
            // 에뮬레이터 주소를 지정하면 SDK가 에뮬레이터용 인증 정보를 알아서 쓴다.
            builder.setEmulatorHost(properties.emulatorHost());
            log.info("Firestore: 에뮬레이터 {} (project {})", properties.emulatorHost(), properties.projectId());
        } else {
            log.info("Firestore: project {}", properties.projectId());
        }

        return builder.build().getService();
    }
}
