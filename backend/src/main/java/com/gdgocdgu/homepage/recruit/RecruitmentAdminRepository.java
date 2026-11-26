package com.gdgocdgu.homepage.recruit;

import java.time.Instant;

/** 운영진 회차 쓰기 (RCT-007 · 008). 메서드 하나가 트랜잭션 하나다. */
public interface RecruitmentAdminRepository {

    /** 회차를 만든다. 같은 ID(= 같은 기수)가 이미 있으면 만들지 않고 false. */
    boolean create(NewRecruitment recruitment);

    /**
     * 트랜잭션에서 회차를 읽어 {@code updater}로 바뀐 회차를 계산하고 저장한다. 바뀐 회차를 돌려준다.
     * 기수가 바뀌어 ID가 달라지면 지원서가 없을 때만 회차와 폼 · 평가 기준 버전을 새 ID로 옮긴다.
     * 회차가 없으면 NOT_FOUND, 지원서가 있으면 COHORT_LOCKED, 새 ID가 이미 있으면 COHORT_EXISTS.
     */
    Recruitment update(String rid, RecruitmentUpdater updater, String actorId, Instant now);

    @FunctionalInterface
    interface RecruitmentUpdater {
        Recruitment apply(Recruitment current, boolean membersRegistered);
    }
}
