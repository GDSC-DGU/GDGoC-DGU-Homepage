package com.gdgocdgu.homepage.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.SignatureException;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Component
public final class GoogleTokenVerifier {

    private static final GsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();

    private final GoogleIdTokenVerifier verifier;

    public GoogleTokenVerifier(@Value("${GOOGLE_CLIENT_ID:}") String webClientId) {
        if (webClientId == null || webClientId.isBlank()) {
            this.verifier = null;
            return;
        }

        // 우리 앱에 발급된 토큰만 받도록 발급 대상(audience)을 지정한다.
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), JSON_FACTORY)
                .setAudience(Collections.singletonList(webClientId))
                .build();
    }

    public Optional<String> verify(String idToken) throws IOException, GeneralSecurityException {
        if (idToken == null || idToken.isBlank()) {
            return Optional.empty();
        }

        GoogleIdToken token;
        try {
            // 토큰 정보를 읽는다. 서명 검증은 아래에서 한다.
            token = GoogleIdToken.parse(JSON_FACTORY, idToken);
        } catch (IllegalArgumentException | IOException invalidToken) {
            return Optional.empty();
        }

        GoogleIdToken.Payload payload = token.getPayload();
        Object audience = payload.getAudience();
        if (!(audience instanceof String || audience instanceof List<?>)
                || payload.getExpirationTimeSeconds() == null || payload.getIssuedAtTimeSeconds() == null) {
            return Optional.empty();
        }

        // 형식이 잘못된 토큰을 먼저 걸러낸 뒤 서버 설정을 확인한다.
        if (verifier == null) {
            throw new IllegalStateException("Google 로그인에 필요한 GOOGLE_CLIENT_ID가 설정되지 않았습니다.");
        }

        try {
            // 서명, 발급자, 발급 대상, 유효 시간을 확인한다.
            if (!verifier.verify(token)) {
                return Optional.empty();
            }
        } catch (SignatureException invalidSignature) {
            return Optional.empty();
        }

        if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
            return Optional.empty();
        }

        // sub는 회원 조회에 쓸 Google 계정 ID다.
        return Optional.ofNullable(payload.getSubject()).filter(subject -> !subject.isBlank());
    }
}
