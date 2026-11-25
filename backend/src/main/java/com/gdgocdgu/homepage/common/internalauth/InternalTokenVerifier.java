package com.gdgocdgu.homepage.common.internalauth;

/** {@code Authorization: Bearer} 토큰이 허용된 서비스 계정의 것인지 확인한다. */
public interface InternalTokenVerifier {

    /** 서명 · 발급자 · audience · 만료 · 이메일 허용 여부를 모두 통과하면 true. 어떤 실패에도 예외를 던지지 않는다. */
    boolean verify(String idToken);
}
