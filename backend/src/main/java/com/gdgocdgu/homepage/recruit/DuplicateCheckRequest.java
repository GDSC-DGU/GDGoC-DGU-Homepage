package com.gdgocdgu.homepage.recruit;

/** API-RCT-003 요청 본문. 형식 검사는 정규화와 함께 service에서 한다. */
public record DuplicateCheckRequest(String studentId) {
}
