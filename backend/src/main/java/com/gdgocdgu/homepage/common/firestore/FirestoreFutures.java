package com.gdgocdgu.homepage.common.firestore;

import com.google.api.core.ApiFuture;
import java.util.concurrent.ExecutionException;

/** Firestore SDK의 비동기 결과(ApiFuture)를 기다려 값을 꺼낸다. repository에서만 쓴다. */
public final class FirestoreFutures {

    private FirestoreFutures() {
    }

    public static <T> T await(ApiFuture<T> future) {
        try {
            return future.get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Firestore 요청 대기 중 중단되었습니다.", e);
        } catch (ExecutionException e) {
            throw new IllegalStateException("Firestore 요청이 실패했습니다.", e.getCause());
        }
    }
}
