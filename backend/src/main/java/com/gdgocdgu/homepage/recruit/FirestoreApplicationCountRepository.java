package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.firestore.FirestoreFutures;
import com.google.cloud.firestore.Firestore;
import org.springframework.stereotype.Repository;

/** 지원자 수는 저장하지 않고 count() 집계로 구한다 (rct-data-model.md 3-1). 같음 조건만 있어 복합 인덱스가 필요 없다. */
@Repository
class FirestoreApplicationCountRepository implements ApplicationCountRepository {

    private final Firestore firestore;

    FirestoreApplicationCountRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    @Override
    public long countActive(String rid) {
        return FirestoreFutures.await(firestore.collection(FirestoreApplicationSubmitRepository.APPLICATIONS)
                .whereEqualTo("rid", rid)
                .whereEqualTo("deleted", false)
                .count()
                .get()).getCount();
    }
}
