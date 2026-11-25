package com.gdgocdgu.homepage.auth;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.common.error.CommonErrorCode;
import com.gdgocdgu.homepage.common.error.ErrorResponse;
import com.gdgocdgu.homepage.common.response.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    private static final String REFRESH_COOKIE = "refreshToken";
    // refresh 쿠키는 이 경로 아래(/google · /refresh · /logout)에만 실려 간다.
    private static final String REFRESH_COOKIE_PATH = "/api/v1/auth";

    private final AuthService authService;
    private final List<String> allowedOrigins;
    private final boolean secureRefreshCookie;

    public AuthController(AuthService authService,
                          @Value("${app.auth.allowed-origins:}") List<String> allowedOrigins,
                          @Value("${app.auth.refresh-cookie-secure:true}") boolean secureRefreshCookie) {
        this.authService = authService;
        this.allowedOrigins = allowedOrigins;
        this.secureRefreshCookie = secureRefreshCookie;
    }

    /** [API-AUTH-001] Google 로그인 */
    @PostMapping("/google")
    public ResponseEntity<ApiResponse<TokenResponse>> loginWithGoogle(
            @Valid @RequestBody GoogleLoginRequest request,
            @RequestHeader(name = HttpHeaders.ORIGIN, required = false) String origin) {
        checkOrigin(origin);

        LoginSession session = authService.loginWithGoogle(request.idToken());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.SET_COOKIE, refreshCookie(session.refreshToken(), LoginSessionIssuer.SESSION_LIFETIME).toString())
                .body(ApiResponse.ok(TokenResponse.of(session.accessToken(),
                        LoginSessionIssuer.ACCESS_TOKEN_LIFETIME.toSeconds(), session.expiresAt(), session.member())));
    }

    /** [API-AUTH-002] 로그인 토큰 갱신. access token 이 없어도(새로고침) 쿠키만으로 부를 수 있다 */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
            @RequestHeader(name = HttpHeaders.ORIGIN, required = false) String origin) {
        checkOrigin(origin);
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ApiException(AuthErrorCode.REFRESH_TOKEN_REQUIRED);
        }

        AccessGrant grant = authService.refresh(refreshToken);
        // refresh token 은 그대로라 쿠키를 다시 보내지 않는다 (최종 만료 1시간도 그대로).
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.ok(TokenResponse.of(grant.accessToken(), grant.expiresInSeconds(),
                        grant.sessionExpiresAt(), grant.member())));
    }

    /**
     * [API-AUTH-003] 로그아웃. 쿠키가 없거나 이미 끝난 세션이어도 200 이고, 언제나 쿠키를 지운다.
     * 세션 무효화가 실패하면 쿠키는 지우되 500 으로 알린다: 이 브라우저는 로그아웃되지만 서버 세션은 최종 만료까지 남기 때문에
     * 성공(200)이라고 답하지 않는다.
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
            @RequestHeader(name = HttpHeaders.ORIGIN, required = false) String origin) {
        checkOrigin(origin);
        String clearCookie = refreshCookie("", Duration.ZERO).toString();
        if (refreshToken != null && !refreshToken.isBlank()) {
            try {
                authService.logout(refreshToken);
            } catch (RuntimeException e) {
                log.error("로그아웃 세션 무효화 실패. 쿠키만 지우고 500 으로 알린다.", e);
                return ResponseEntity.status(CommonErrorCode.INTERNAL_ERROR.status())
                        .cacheControl(CacheControl.noStore())
                        .header(HttpHeaders.SET_COOKIE, clearCookie)
                        .body(ErrorResponse.of(CommonErrorCode.INTERNAL_ERROR, CommonErrorCode.INTERNAL_ERROR.defaultMessage()));
            }
        }
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.SET_COOKIE, clearCookie)
                .body(ApiResponse.ok(null));
    }

    // 브라우저가 출처를 보냈다면 허용 목록과 일치해야 한다 (다른 사이트가 쿠키를 실어 부르는 것을 막음).
    private void checkOrigin(String origin) {
        if (origin != null && !allowedOrigins.contains(origin)) {
            throw new ApiException(AuthErrorCode.INVALID_ORIGIN);
        }
    }

    // maxAge 0 이면 브라우저가 쿠키를 지운다. 지울 때도 경로 · 속성이 같아야 같은 쿠키로 본다.
    private ResponseCookie refreshCookie(String value, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(secureRefreshCookie)
                .sameSite("Lax")
                .path(REFRESH_COOKIE_PATH)
                .maxAge(maxAge)
                .build();
    }

    // idToken이 없거나 비어 있으면 요청 검증 단계에서 400을 반환한다.
    public record GoogleLoginRequest(@NotBlank String idToken) {
    }

    /** 로그인 · 갱신 공통 응답 (API 명세의 두 응답 모양이 같다) */
    public record TokenResponse(
            String accessToken, String tokenType, long expiresIn, String sessionExpiresAt, UserResponse user
    ) {
        static TokenResponse of(String accessToken, long expiresIn, Instant sessionExpiresAt, LoginMember member) {
            return new TokenResponse(accessToken, "Bearer", expiresIn,
                    DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(sessionExpiresAt.atOffset(ZoneOffset.ofHours(9))),
                    new UserResponse(member.userId(), member.name(), member.role()));
        }
    }

    public record UserResponse(String userId, String name, String role) {
    }
}
