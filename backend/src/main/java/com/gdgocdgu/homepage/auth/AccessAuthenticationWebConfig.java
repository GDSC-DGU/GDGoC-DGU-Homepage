package com.gdgocdgu.homepage.auth;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration(proxyBeanMethods = false)
class AccessAuthenticationWebConfig implements WebMvcConfigurer {

    private final AccessAuthenticationService authenticationService;

    AccessAuthenticationWebConfig(AccessAuthenticationService authenticationService) {
        this.authenticationService = authenticationService;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new AuthenticatedMemberResolver(authenticationService));
    }

    private record AuthenticatedMemberResolver(AccessAuthenticationService authenticationService)
            implements HandlerMethodArgumentResolver {

        @Override
        public boolean supportsParameter(MethodParameter parameter) {
            return parameter.getParameterType() == AuthenticatedMember.class;
        }

        @Override
        public AuthenticatedMember resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
                                                   NativeWebRequest request, WebDataBinderFactory binderFactory) {
            String[] headers = request.getHeaderValues(HttpHeaders.AUTHORIZATION);
            String authorization = headers != null && headers.length == 1 ? headers[0] : null;
            return authenticationService.authenticate(authorization);
        }
    }
}
