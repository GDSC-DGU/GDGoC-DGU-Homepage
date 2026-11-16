package com.gdgocdgu.homepage.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.SignatureException;
import java.util.Collections;
import java.util.Optional;

public final class GoogleTokenVerifier {

    private final GoogleIdTokenVerifier verifier;

    public GoogleTokenVerifier(String webClientId) {
        if (webClientId == null || webClientId.isBlank()) {
            throw new IllegalArgumentException("Google 웹 클라이언트 ID를 설정해야 합니다.");
        }

        // 프론트에서 사용하는 웹 클라이언트 ID를 지정해야 우리 앱에 발급된 토큰만 받는다.
        // 검증기를 재사용하면 Google에서 받은 공개 키를 캐시에 보관할 수 있다.
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(webClientId))
                .build();
    }

    /**
     * 유효한 토큰이면 Google 계정의 고유 ID(sub)를 반환한다.
     * 토큰이 유효하지 않으면 빈 결과를 반환하고, 검증 중 공개 키를 가져오지 못하는 등
     * 검증 자체가 실패하면 예외를 호출한 쪽에 넘긴다.
     */
    public Optional<String> verify(String idToken) throws IOException, GeneralSecurityException {
        if (idToken == null || idToken.isBlank()) {
            return Optional.empty();
        }

        GoogleIdToken token;
        try {
            // 토큰 문자열에서 필드를 읽는 단계다. 서명을 확인하기 전에는 이 값을 신뢰하지 않는다.
            token = GoogleIdToken.parse(verifier.getJsonFactory(), idToken);
        } catch (IllegalArgumentException | IOException invalidToken) {
            return Optional.empty();
        }

        GoogleIdToken.Payload payload = token.getPayload();
        // Google 라이브러리가 시간 값을 비교하기 전에 필수 시간이 모두 들어 있는지 확인한다.
        if (payload.getExpirationTimeSeconds() == null || payload.getIssuedAtTimeSeconds() == null) {
            return Optional.empty();
        }

        try {
            // Google의 공개 키로 서명을 검증하고 발급자, 대상 클라이언트, 시간을 확인한다.
            if (!verifier.verify(token)) {
                return Optional.empty();
            }
        } catch (SignatureException invalidSignature) {
            return Optional.empty();
        }

        // 이메일 확인 여부를 검사한다. 회원을 찾는 데 쓸 값은 Google 계정의 고유 ID인 sub다.
        if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
            return Optional.empty();
        }

        return Optional.ofNullable(payload.getSubject()).filter(subject -> !subject.isBlank());
    }
}
