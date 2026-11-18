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
        authService.verifyLoginMember(request.idToken());

        // 활성 회원까지 확인했다. 세션 발급 전까지는 501을 반환한다.
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    // idToken이 없거나 비어 있으면 요청 검증 단계에서 400을 반환한다.
    public record GoogleLoginRequest(@NotBlank String idToken) {
    }
}
