package com.gdgocdgu.homepage.recruit.scoring;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * API-RCT-028 요청 본문. Cloud Tasks가 보낸다.
 * {@code aid}는 문서 경로에 쓰이므로 '/'가 들어가지 않게 문자를 제한한다.
 */
record ScoringRequest(
        @NotBlank @Size(max = 100) @Pattern(regexp = "[A-Za-z0-9_-]+") String aid,
        @NotNull @Min(1) Integer criteriaVersion) {
}
