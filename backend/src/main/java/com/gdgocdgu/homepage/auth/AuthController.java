package com.gdgocdgu.homepage.auth;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.common.response.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

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

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<GoogleLoginResponse>> loginWithGoogle(
            @Valid @RequestBody GoogleLoginRequest request,
            @RequestHeader(name = HttpHeaders.ORIGIN, required = false) String origin) {
        // 브라우저가 출처를 보냈다면 허용 목록과 일치해야 한다.
        if (origin != null && !allowedOrigins.contains(origin)) {
            throw new ApiException(AuthErrorCode.INVALID_ORIGIN);
        }

        LoginSession session = authService.loginWithGoogle(request.idToken());
        ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", session.refreshToken())
                .httpOnly(true)
                .secure(secureRefreshCookie)
                .sameSite("Lax")
                .path("/api/v1/auth")
                .maxAge(LoginSessionIssuer.SESSION_LIFETIME)
                .build();

        LoginMember member = session.member();
        GoogleLoginResponse response = new GoogleLoginResponse(
                session.accessToken(), "Bearer", LoginSessionIssuer.ACCESS_TOKEN_LIFETIME.toSeconds(),
                DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(session.expiresAt().atOffset(ZoneOffset.ofHours(9))),
                new UserResponse(member.userId(), member.name(), member.role()));

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(ApiResponse.ok(response));
    }

    // idToken이 없거나 비어 있으면 요청 검증 단계에서 400을 반환한다.
    public record GoogleLoginRequest(@NotBlank String idToken) {
    }

    public record GoogleLoginResponse(
            String accessToken, String tokenType, long expiresIn, String sessionExpiresAt, UserResponse user
    ) {
    }

    public record UserResponse(String userId, String name, String role) {
    }
}
