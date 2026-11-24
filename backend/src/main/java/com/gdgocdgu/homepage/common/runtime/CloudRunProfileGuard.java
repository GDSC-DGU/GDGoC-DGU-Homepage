package com.gdgocdgu.homepage.common.runtime;

import java.util.Arrays;
import java.util.Set;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

/**
 * Cloud Run({@code K_SERVICE} 환경변수가 있을 때)에서 dev · prod 프로필 없이 뜨면 시작을 막는다.
 *
 * <p>프로필을 따로 지정하지 않으면 {@code local}이 적용되는데, local은 /internal 인증을 끄고 Firestore 에뮬레이터를 쓴다.
 * 프로필 지정을 빠뜨린 채 배포돼 인증 없이 열리는 일을 막기 위한 장치다.
 */
@Configuration
public class CloudRunProfileGuard {

    private static final Set<String> DEPLOY_PROFILES = Set.of("dev", "prod");

    CloudRunProfileGuard(Environment env) {
        check(env.getProperty("K_SERVICE"), env.getActiveProfiles());
    }

    static void check(String kService, String[] activeProfiles) {
        if (kService == null || kService.isBlank()) return;
        if (Arrays.stream(activeProfiles).noneMatch(DEPLOY_PROFILES::contains)) {
            throw new IllegalStateException("Cloud Run(K_SERVICE=" + kService + ")에서 dev 또는 prod 프로필 없이 시작할 수 없습니다. "
                    + "SPRING_PROFILES_ACTIVE 를 설정하세요. (현재 활성 프로필: " + Arrays.toString(activeProfiles) + ")");
        }
    }
}
