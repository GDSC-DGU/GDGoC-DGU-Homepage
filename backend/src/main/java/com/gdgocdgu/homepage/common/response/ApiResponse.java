package com.gdgocdgu.homepage.common.response;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

/**
 * 성공 응답. 결과는 data 안에 담아 { success:true, data } 모양으로 내려간다.
 * (API 명세: 성공 응답은 data로 감싼다. 실패 응답은 ErrorResponse)
 */
@JsonPropertyOrder({"success", "data"})
public record ApiResponse<T>(boolean success, T data) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data);
    }
}
