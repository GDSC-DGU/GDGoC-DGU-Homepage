package com.gdgocdgu.homepage.common.error;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 예외 처리 검증 전용. 테스트 소스에만 있어 운영 코드에는 포함되지 않는다. */
@RestController
@RequestMapping("/test-support/errors")
class ErrorTestController {

    @GetMapping("/api")
    void api() {
        throw new ApiException(CommonErrorCode.FORBIDDEN);
    }

    @GetMapping("/api-message")
    void apiMessage() {
        throw new ApiException(CommonErrorCode.NOT_FOUND, "모집 공고를 찾을 수 없습니다.");
    }

    @PostMapping("/valid")
    void valid(@Valid @RequestBody Body body) {
    }

    @GetMapping("/param")
    void param(@RequestParam int page) {
    }

    @GetMapping("/boom")
    void boom() {
        throw new IllegalStateException("응답에 나오면 안 되는 내부 메시지");
    }

    record Body(@NotBlank String name) {
    }
}
