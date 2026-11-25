package com.gdgocdgu.homepage.recruit;

/** 제출 트랜잭션의 결과. */
public sealed interface SubmitResult {

    /** 저장했다. {@code criteriaVersion}으로 채점 작업을 등록한다. */
    record Submitted(int criteriaVersion) implements SubmitResult {
    }

    /** 트랜잭션 안에서 다시 확인했을 때 접수할 수 없었다. 아무것도 저장하지 않았다. */
    record Rejected(RecruitErrorCode code) implements SubmitResult {
    }
}
