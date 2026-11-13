package com.gdgocdgu.homepage.common.error;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

/** 실패 응답. 필드는 success, code, message 3개뿐이다. */
@JsonPropertyOrder({"success", "code", "message"})
public record ErrorResponse(boolean success, String code, String message) {

    public static ErrorResponse of(ErrorCode errorCode, String message) {
        return new ErrorResponse(false, errorCode.code(), message);
    }
}
