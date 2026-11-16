package com.gdgocdgu.homepage.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/google")
    public ResponseEntity<Void> loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
        authService.verifyGoogleToken(request.idToken());

        // 다음 단계에서 검증한 Google 계정 ID로 회원을 조회하고 로그인 세션을 발급한다.
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    public record GoogleLoginRequest(@NotBlank String idToken) {
    }
}
