package com.gdgocdgu.homepage.recruit;

import java.util.Locale;
import java.util.regex.Pattern;

/** 중복 판단에 쓰는 학번 · 이메일 정규화 (RCT-003 · 005). 형식이 틀리면 null을 돌려준다. */
final class ApplicantNormalizer {

    private static final Pattern STUDENT_ID = Pattern.compile("[0-9]{10}");
    private static final Pattern EMAIL = Pattern.compile("[^@\\s]+@[^@\\s]+\\.[^@\\s]+");
    private static final int EMAIL_MAX_LENGTH = 254;

    private ApplicantNormalizer() {
    }

    /** 앞뒤 공백을 지운 숫자 10자리. */
    static String studentId(String raw) {
        String normalized = raw == null ? "" : raw.strip();
        return STUDENT_ID.matcher(normalized).matches() ? normalized : null;
    }

    /** 앞뒤 공백을 지우고 소문자로 바꾼 이메일. */
    static String email(String raw) {
        String normalized = raw == null ? "" : raw.strip().toLowerCase(Locale.ROOT);
        if (normalized.length() > EMAIL_MAX_LENGTH || !EMAIL.matcher(normalized).matches()) {
            return null;
        }
        return normalized;
    }
}
