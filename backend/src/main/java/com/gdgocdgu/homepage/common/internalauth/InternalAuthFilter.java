package com.gdgocdgu.homepage.common.internalauth;

import com.gdgocdgu.homepage.common.error.CommonErrorCode;
import com.gdgocdgu.homepage.common.error.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

/**
 * {@code /internal/**} 요청만 검사하는 필터. 사용자 로그인(JWT)과 별개로, 허용된 서비스 계정이 붙인
 * OIDC ID 토큰({@code Authorization: Bearer ...})만 통과시킨다.
 * 필터는 {@code @RestControllerAdvice} 밖이라 401 본문을 표준 오류 형식으로 직접 쓴다. 토큰은 로그에 남기지 않는다.
 */
public class InternalAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(InternalAuthFilter.class);
    private static final String BEARER = "Bearer ";

    private final InternalTokenVerifier verifier;
    private final boolean disabled;
    private final ObjectMapper objectMapper;

    public InternalAuthFilter(InternalTokenVerifier verifier, boolean disabled, ObjectMapper objectMapper) {
        this.verifier = verifier;
        this.disabled = disabled;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return disabled || !(path.equals("/internal") || path.startsWith("/internal/"));
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.regionMatches(true, 0, BEARER, 0, BEARER.length())) {
            String token = header.substring(BEARER.length()).trim();
            if (!token.isEmpty() && verifier.verify(token)) {
                chain.doFilter(request, response);
                return;
            }
        }
        log.warn("내부 API 인증 실패: path={}", request.getRequestURI());
        response.setStatus(CommonErrorCode.AUTH_REQUIRED.status().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(objectMapper.writeValueAsString(
                ErrorResponse.of(CommonErrorCode.AUTH_REQUIRED, CommonErrorCode.AUTH_REQUIRED.defaultMessage())));
    }
}
