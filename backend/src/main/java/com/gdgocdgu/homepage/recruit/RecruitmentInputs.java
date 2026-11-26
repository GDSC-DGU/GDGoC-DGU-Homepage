package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.common.error.CommonErrorCode;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.HashSet;
import java.util.List;

/** RCT-007 · 008 입력 검사. 틀리면 어떤 값인지 밝히지 않고 VALIDATION_FAILED를 던진다. */
final class RecruitmentInputs {

    private static final int TITLE_MAX_LENGTH = 100;
    private static final int NOTICE_MAX_LENGTH = 20_000;
    private static final int TRACK_MAX_COUNT = 10;
    private static final int TRACK_MAX_LENGTH = 20;

    private RecruitmentInputs() {
    }

    static ApiException invalid() {
        return new ApiException(CommonErrorCode.VALIDATION_FAILED, "입력 값을 확인해주세요.");
    }

    static int cohort(Integer cohort) {
        if (cohort == null || cohort < 1) {
            throw invalid();
        }
        return cohort;
    }

    static String title(String title) {
        String stripped = title == null ? "" : title.strip();
        if (stripped.isEmpty() || length(stripped) > TITLE_MAX_LENGTH) {
            throw invalid();
        }
        return stripped;
    }

    static String notice(String notice) {
        String value = notice == null ? "" : notice;
        if (length(value) > NOTICE_MAX_LENGTH) {
            throw invalid();
        }
        return value;
    }

    static List<String> tracks(List<String> tracks) {
        if (tracks == null || tracks.isEmpty() || tracks.size() > TRACK_MAX_COUNT) {
            throw invalid();
        }
        List<String> stripped = tracks.stream().map(track -> track == null ? "" : track.strip()).toList();
        if (stripped.stream().anyMatch(track -> track.isEmpty() || length(track) > TRACK_MAX_LENGTH)
                || new HashSet<>(stripped).size() != stripped.size()) {
            throw invalid();
        }
        return stripped;
    }

    /** 오프셋이 없는 시각은 어느 시간대인지 알 수 없어 받지 않는다. */
    static Instant instant(String value) {
        if (value == null) {
            throw invalid();
        }
        try {
            return OffsetDateTime.parse(value).toInstant();
        } catch (DateTimeParseException e) {
            throw invalid();
        }
    }

    static void period(Instant start, Instant end) {
        if (!start.isBefore(end)) {
            throw invalid();
        }
    }

    private static int length(String value) {
        return value.codePointCount(0, value.length());
    }
}
