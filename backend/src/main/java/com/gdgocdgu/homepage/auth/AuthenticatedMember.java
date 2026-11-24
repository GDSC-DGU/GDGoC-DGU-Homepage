package com.gdgocdgu.homepage.auth;

/** 보호 API의 컨트롤러 인자로 선언하면 현재 로그인한 회원을 받는다. */
public record AuthenticatedMember(String userId, String role) {
}
