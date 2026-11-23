package com.gdgocdgu.homepage.common.time;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * API 응답의 시각 형식. 명세 공통 규칙: ISO 8601 KST(+09:00), 초 단위까지.
 * 예: 2027-02-20T00:00:00+09:00
 * Jackson 기본 형식은 초가 0이면 초를 생략하므로(00:00+09:00) 응답 DTO는 이 클래스로 만든 문자열을 쓴다.
 */
public final class KstTime {

    public static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

    private static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX").withZone(ZONE);

    private KstTime() {
    }

    public static String format(Instant instant) {
        return instant == null ? null : FORMAT.format(instant);
    }
}
