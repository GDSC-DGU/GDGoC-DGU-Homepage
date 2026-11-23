package com.gdgocdgu.homepage.recruit;

import java.util.List;

/** 모집 회차 저장소. service는 이 인터페이스만 알고, Firestore 구현은 {@link FirestoreRecruitmentRepository}. */
public interface RecruitmentRepository {

    /** 모든 회차. 기수당 1개라 문서 수가 적어 전부 읽어 service에서 고른다(rct-data-model.md 5장). */
    List<Recruitment> findAll();
}
