package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.firestore.FirestoreFutures;
import com.google.cloud.firestore.Firestore;
import org.springframework.stereotype.Repository;

/** recruitments/{rid}/applicationKeys 읽기. 구조는 backend/docs/rct-data-model.md 3-4와 같다. */
@Repository
class FirestoreApplicationKeyRepository implements ApplicationKeyRepository {

    static final String COLLECTION = "applicationKeys";

    private final Firestore firestore;

    FirestoreApplicationKeyRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    @Override
    public boolean exists(String rid, String keyId) {
        return FirestoreFutures.await(firestore.collection(FirestoreRecruitmentRepository.COLLECTION)
                .document(rid).collection(COLLECTION).document(keyId).get()).exists();
    }
}
