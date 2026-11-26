package com.gdgocdgu.homepage.recruit;

public interface ApplicationCountRepository {

    /** 회차의 지원서 수. 삭제(RCT-033)된 지원서는 세지 않는다. */
    long countActive(String rid);
}
