package com.gdgocdgu.homepage.auth;

import com.gdgocdgu.homepage.common.error.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.Optional;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final GoogleTokenVerifier googleTokenVerifier;
    private final LoginMemberRepository loginMemberRepository;
    private final LoginSessionRepository loginSessionRepository;
    private final LoginSessionIssuer sessionIssuer;

    public AuthService(GoogleTokenVerifier googleTokenVerifier, LoginMemberRepository loginMemberRepository,
                       LoginSessionRepository loginSessionRepository, LoginSessionIssuer sessionIssuer) {
        this.googleTokenVerifier = googleTokenVerifier;
        this.loginMemberRepository = loginMemberRepository;
        this.loginSessionRepository = loginSessionRepository;
        this.sessionIssuer = sessionIssuer;
    }

    LoginSession loginWithGoogle(String idToken) {
        String googleSubject = verifyGoogleToken(idToken);
        return loginMemberRepository.createSessionForGoogleSubject(googleSubject, this::issueForActiveMember)
                .orElseThrow(() -> new ApiException(AuthErrorCode.GOOGLE_ACCOUNT_NOT_LINKED));
    }

    /**
     * 로그인 토큰 갱신 (API-AUTH-002). refresh token 쿠키로 세션을 찾아 아래 순서로 확인한 뒤 access token 만 새로 준다.
     * 1. 쿠키 모양 · 세션 존재 · 해시 일치 → 아니면 INVALID_REFRESH_TOKEN
     * 2. 로그아웃으로 무효화된 세션 → SESSION_REVOKED
     * 3. 최초 로그인부터 1시간 지남 → SESSION_EXPIRED
     * 4. 회원이 사라졌거나 비활성화 · 관리 유형 변경(authVersion 증가) → SESSION_REVOKED
     */
    AccessGrant refresh(String refreshToken) {
        StoredSession session = findSession(refreshToken)
                .orElseThrow(() -> new ApiException(AuthErrorCode.INVALID_REFRESH_TOKEN));
        if (session.revoked()) {
            throw new ApiException(AuthErrorCode.SESSION_REVOKED);
        }
        if (!session.expiresAt().isAfter(Instant.now())) {
            throw new ApiException(AuthErrorCode.SESSION_EXPIRED);
        }

        // 세션을 만든 뒤 회원 상태가 바뀌었을 수 있으므로 회원 문서를 다시 읽는다.
        LoginMember member = loginMemberRepository.findById(session.userId())
                .filter(LoginMember::active)
                // 역할 변경 · 비활성화 때 회원의 authVersion 이 오르므로, 세션의 값과 다르면 예전 로그인이다.
                .filter(current -> current.authVersion() == session.authVersion())
                .orElseThrow(() -> new ApiException(AuthErrorCode.SESSION_REVOKED));
        requireMemberInfo(member);
        return sessionIssuer.reissue(member, session.id(), session.expiresAt());
    }

    /**
     * 로그아웃 (API-AUTH-003). 쿠키가 가리키는 세션을 무효화한다. 쿠키가 없거나 맞지 않아도 조용히 끝낸다.
     * 무효화에 실패해도 예외를 밖으로 내지 않는다: 응답에서 쿠키는 지워지므로 이 브라우저는 로그아웃되고,
     * 남은 세션은 최종 만료(최대 1시간)에 끝난다. 로그아웃 버튼이 오류로 막히는 것보다 낫다.
     */
    void logout(String refreshToken) {
        try {
            findSession(refreshToken)
                    .filter(session -> !session.revoked())
                    .ifPresent(session -> loginSessionRepository.revoke(session.id(), Instant.now()));
        } catch (RuntimeException e) {
            log.warn("로그아웃 세션 무효화 실패. 쿠키만 지운다.", e);
        }
    }

    /** 쿠키 → 세션 ID → 세션 문서 → 해시 비교. 하나라도 맞지 않으면 비어 있다 */
    private Optional<StoredSession> findSession(String refreshToken) {
        String hash = LoginSessionIssuer.hash(refreshToken);
        return LoginSessionIssuer.sessionIdOf(refreshToken)
                .flatMap(loginSessionRepository::find)
                .filter(session -> session.hasRefreshTokenHash(hash));
    }

    private LoginSession issueForActiveMember(LoginMember member) {
        if (!member.active()) {
            throw new ApiException(AuthErrorCode.USER_INACTIVE);
        }
        requireMemberInfo(member);
        return sessionIssuer.issue(member);
    }

    private static void requireMemberInfo(LoginMember member) {
        if (member.name() == null || member.name().isBlank()
                || (!"ADMIN".equals(member.role()) && !"GENERAL".equals(member.role()))) {
            throw new IllegalStateException("Firestore 회원의 이름 또는 관리 유형을 읽을 수 없습니다.");
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
