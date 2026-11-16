package com.gdgocdgu.homepage.auth;

import com.gdgocdgu.homepage.common.error.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;

@Service
public class AuthService {

    private final GoogleTokenVerifier googleTokenVerifier;

    public AuthService(@Value("${GOOGLE_CLIENT_ID:}") String googleClientId) {
        // Google 설정이 없는 환경에서도 헬스 체크 등 다른 API는 실행할 수 있다.
        this.googleTokenVerifier = googleClientId.isBlank() ? null : new GoogleTokenVerifier(googleClientId);
    }

    public String verifyGoogleToken(String idToken) {
        if (googleTokenVerifier == null) {
            throw new IllegalStateException("Google 로그인에 필요한 GOOGLE_CLIENT_ID가 설정되지 않았습니다.");
        }

        try {
            // 검증 결과가 비어 있으면 공통 예외 처리기를 통해 401 응답을 보낸다.
            return googleTokenVerifier.verify(idToken)
                    .orElseThrow(() -> new ApiException(AuthErrorCode.INVALID_GOOGLE_TOKEN));
        } catch (IOException | GeneralSecurityException e) {
            // 공개 키 조회 등 검증 과정의 장애는 사용자 토큰 오류와 구분한다.
            throw new IllegalStateException("Google ID 토큰 검증을 완료할 수 없습니다.", e);
        }
    }
}
