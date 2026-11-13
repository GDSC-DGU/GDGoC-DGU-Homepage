package com.gdgocdgu.homepage.common.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

/**
 * 성공 응답 표식. 응답 record가 이 인터페이스를 구현하면 JSON 맨 앞에 "success": true가 붙는다.
 * (API 명세: 성공 응답은 감싸지 않고 평평하게 내려간다)
 */
@JsonPropertyOrder("success")
public interface ApiSuccess {

    @JsonProperty("success")
    default boolean success() {
        return true;
    }
}
