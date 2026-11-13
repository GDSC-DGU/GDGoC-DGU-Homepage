package com.gdgocdgu.homepage.common.error;

import org.springframework.http.HttpStatus;

/** 영역(recruit, auth, post …)마다 자기 enum으로 구현한다. */
public interface ErrorCode {

    String code();

    HttpStatus status();

    String defaultMessage();
}
