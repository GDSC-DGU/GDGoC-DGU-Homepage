package com.gdgocdgu.homepage.recruit;

/** 목록 응답의 pagination. 결과가 없으면 totalPages는 0이다. */
public record Pagination(int page, int pageSize, long totalCount, int totalPages) {

    static Pagination of(int page, int pageSize, long totalCount) {
        return new Pagination(page, pageSize, totalCount, (int) ((totalCount + pageSize - 1) / pageSize));
    }
}
