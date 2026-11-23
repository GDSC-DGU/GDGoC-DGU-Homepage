package com.gdgocdgu.homepage.recruit;

import java.util.List;
import java.util.Optional;

/** DB 없이 서비스 규칙을 확인할 때 쓰는 저장소. */
record InMemoryRecruitmentRepository(List<Recruitment> recruitments) implements RecruitmentRepository {

    static InMemoryRecruitmentRepository of(Recruitment... recruitments) {
        return new InMemoryRecruitmentRepository(List.of(recruitments));
    }

    @Override
    public List<Recruitment> findAll() {
        return recruitments;
    }

    @Override
    public Optional<Recruitment> findById(String rid) {
        return recruitments.stream().filter(recruitment -> recruitment.rid().equals(rid)).findFirst();
    }
}
