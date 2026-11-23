package com.gdgocdgu.homepage.recruit.scoring;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.IdTokenCredentials;
import com.google.auth.oauth2.IdTokenProvider;
import java.io.IOException;

/** AI 서버(Cloud Run)에 보낼 Google ID 토큰을 준다. */
interface IdTokenSupplier {

    String get() throws IOException;

    /**
     * Application Default Credentials(Cloud Run에서는 backend-runtime 서비스 계정)로 audience용 ID 토큰을 만든다.
     * 토큰은 만료 전까지 재사용하고 키 파일은 쓰지 않는다. 처음 쓸 때 만든다(앱 시작을 막지 않는다).
     * AI 서비스에 대한 run.invoker 권한이 backend-runtime에 있어야 한다.
     */
    static IdTokenSupplier applicationDefault(String audience) {
        return new IdTokenSupplier() {
            private IdTokenCredentials credentials;

            @Override
            public synchronized String get() throws IOException {
                if (credentials == null) {
                    GoogleCredentials adc = GoogleCredentials.getApplicationDefault();
                    if (!(adc instanceof IdTokenProvider provider)) {
                        throw new IOException("ADC가 ID 토큰 발급을 지원하지 않습니다.");
                    }
                    credentials = IdTokenCredentials.newBuilder()
                            .setIdTokenProvider(provider)
                            .setTargetAudience(audience)
                            .build();
                }
                credentials.refreshIfExpired();
                return credentials.getIdToken().getTokenValue();
            }
        };
    }
}
