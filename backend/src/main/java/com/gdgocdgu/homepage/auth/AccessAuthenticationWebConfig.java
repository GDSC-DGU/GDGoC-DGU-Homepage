package com.gdgocdgu.homepage.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.MethodParameter;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Enumeration;
import java.util.List;

@Configuration(proxyBeanMethods = false)
class AccessAuthenticationWebConfig implements WebMvcConfigurer {

    private static final String MEMBER_ATTRIBUTE = AuthenticatedMember.class.getName();

    private final AccessAuthenticationService authenticationService;

    AccessAuthenticationWebConfig(AccessAuthenticationService authenticationService) {
        this.authenticationService = authenticationService;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new AuthenticatedMemberResolver());
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AdminOnlyInterceptor());
    }

    private AuthenticatedMember resolveMember(HttpServletRequest request) {
        // 권한 검사와 컨트롤러 인자에 같은 인증 결과를 사용한다.
        if (request.getAttribute(MEMBER_ATTRIBUTE) instanceof AuthenticatedMember member) {
            return member;
        }

        Enumeration<String> headers = request.getHeaders(HttpHeaders.AUTHORIZATION);
        String authorization = headers != null && headers.hasMoreElements() ? headers.nextElement() : null;
        AuthenticatedMember member = authenticationService.authenticate(
                headers != null && headers.hasMoreElements() ? null : authorization);
        request.setAttribute(MEMBER_ATTRIBUTE, member);
        return member;
    }

    private final class AdminOnlyInterceptor implements HandlerInterceptor {

        @Override
        public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
            if (handler instanceof HandlerMethod method && (method.hasMethodAnnotation(AdminOnly.class)
                    || AnnotatedElementUtils.hasAnnotation(method.getBeanType(), AdminOnly.class))) {
                authenticationService.requireAdmin(resolveMember(request));
            }
            return true;
        }
    }

    private final class AuthenticatedMemberResolver implements HandlerMethodArgumentResolver {

        @Override
        public boolean supportsParameter(MethodParameter parameter) {
            return parameter.getParameterType() == AuthenticatedMember.class;
        }

        @Override
        public AuthenticatedMember resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
                                                   NativeWebRequest request, WebDataBinderFactory binderFactory) {
            return resolveMember(request.getNativeRequest(HttpServletRequest.class));
        }
    }
}
