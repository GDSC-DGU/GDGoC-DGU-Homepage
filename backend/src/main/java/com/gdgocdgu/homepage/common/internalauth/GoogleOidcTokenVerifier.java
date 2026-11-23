package com.gdgocdgu.homepage.common.internalauth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Google이 서명한 OIDC ID 토큰을 검증한다(Cloud Tasks가 붙이는 토큰).
 * 서명(Google 공개키), 발급자(accounts.google.com), audience(backend 주소), 만료를 확인하고,
 * 이메일이 인증됐고 허용 목록에 있는지 확인한다. 토큰 내용은 로그에 남기지 않는다.
 */
public class GoogleOidcTokenVerifier implements InternalTokenVerifier {

    private static final Logger log = LoggerFactory.getLogger(GoogleOidcTokenVerifier.class);

    private final GoogleIdTokenVerifier verifier;
    private final Set<String> allowedEmails;

    public GoogleOidcTokenVerifier(String audience, List<String> allowedServiceAccounts) {
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(List.of(stripTrailingSlash(audience)))
                .setIssuers(List.of("https://accounts.google.com", "accounts.google.com"))
                .build();
        this.allowedEmails = Set.copyOf(allowedServiceAccounts);
    }

    @Override
    public boolean verify(String idToken) {
        try {
            GoogleIdToken token = verifier.verify(idToken);
            if (token == null) {
                return false;
            }
            GoogleIdToken.Payload payload = token.getPayload();
            return Boolean.TRUE.equals(payload.getEmailVerified())
                    && payload.getEmail() != null
                    && allowedEmails.contains(payload.getEmail());
        } catch (Exception e) {
            // 형식 오류 · 서명 불일치 · 공개키 조회 실패 모두 거절한다. 예외 종류만 남긴다.
            log.warn("내부 호출 토큰 검증 실패: error={}", e.getClass().getSimpleName());
            return false;
        }
    }

    static String stripTrailingSlash(String url) {
        String trimmed = url.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }
}
