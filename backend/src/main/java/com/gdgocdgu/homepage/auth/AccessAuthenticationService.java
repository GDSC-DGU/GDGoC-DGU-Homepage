package com.gdgocdgu.homepage.auth;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.common.error.CommonErrorCode;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
class AccessAuthenticationService {

    private final AccessTokenVerifier accessTokenVerifier;
    private final LoginMemberRepository loginMemberRepository;

    AccessAuthenticationService(AccessTokenVerifier accessTokenVerifier, LoginMemberRepository loginMemberRepository) {
        this.accessTokenVerifier = accessTokenVerifier;
        this.loginMemberRepository = loginMemberRepository;
    }

    AuthenticatedMember authenticate(String authorizationHeader) {
        var token = accessTokenVerifier.verify(authorizationHeader);
        var session = loginMemberRepository.findSessionMember(token.sessionId(), token.userId())
                .orElseThrow(() -> new ApiException(CommonErrorCode.AUTH_REQUIRED));
        LoginMember member = session.member();

        // 역할 변경이나 계정 연결 해제로 인증 버전이 바뀌면 기존 토큰을 거절한다.
        if (!token.userId().equals(session.sessionUserId()) || session.sessionRevoked()
                || !session.sessionExpiresAt().isAfter(Instant.now()) || !member.active()
                || session.sessionAuthVersion() != member.authVersion()) {
            throw new ApiException(CommonErrorCode.AUTH_REQUIRED);
        }

        String role = member.role();
        if (!"ADMIN".equals(role) && !"GENERAL".equals(role)) {
            throw new IllegalStateException("Firestore 회원의 관리 유형을 읽을 수 없습니다.");
        }
        return new AuthenticatedMember(member.userId(), role);
    }

    void requireAdmin(AuthenticatedMember member) {
        if (!"ADMIN".equals(member.role())) {
            throw new ApiException(CommonErrorCode.FORBIDDEN);
        }
    }
}
