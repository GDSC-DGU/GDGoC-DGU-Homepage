package com.gdgocdgu.homepage.recruit;

public interface ApplicationSubmitRepository {

    /**
     * 한 트랜잭션에서 회차(접수 가능 · 폼 버전)와 중복 키를 다시 확인하고, 통과하면 지원서와 키 두 개를 만든다.
     * 회차에 평가 기준 버전이 없으면 저장하지 않고 {@link IllegalStateException}을 던진다.
     */
    SubmitResult submit(NewApplication application);
}
