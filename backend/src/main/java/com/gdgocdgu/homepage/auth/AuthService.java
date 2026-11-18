package com.gdgocdgu.homepage.auth;

import com.gdgocdgu.homepage.common.error.ApiException;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;

@Service
public class AuthService {

    private final GoogleTokenVerifier googleTokenVerifier;
    private final LoginMemberRepository loginMemberRepository;

    public AuthService(GoogleTokenVerifier googleTokenVerifier, LoginMemberRepository loginMemberRepository) {
        this.googleTokenVerifier = googleTokenVerifier;
        this.loginMemberRepository = loginMemberRepository;
    }

    public void verifyLoginMember(String idToken) {
        String googleSubject = verifyGoogleToken(idToken);
        boolean active = loginMemberRepository.findActiveStatusByGoogleSubject(googleSubject)
                .orElseThrow(() -> new ApiException(AuthErrorCode.GOOGLE_ACCOUNT_NOT_LINKED));
        if (!active) {
            throw new ApiException(AuthErrorCode.USER_INACTIVE);
        }
    }

    private String verifyGoogleToken(String idToken) {
        try {
            // 검증 결과가 비어 있으면 토큰 오류(401)로 처리한다.
            return googleTokenVerifier.verify(idToken)
                    .orElseThrow(() -> new ApiException(AuthErrorCode.INVALID_GOOGLE_TOKEN));
        } catch (IOException | GeneralSecurityException e) {
            // 공개 키 조회 실패 등은 서버 오류(500)로 처리한다.
            throw new IllegalStateException("Google ID 토큰 검증을 완료할 수 없습니다.", e);
        }
    }
}
