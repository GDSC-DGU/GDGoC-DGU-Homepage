package com.gdgocdgu.homepage.common.firestore;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.gdgocdgu.homepage.support.FirestoreEmulator;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * 에뮬레이터에 실제로 쓰고 읽어 연결을 확인한다.
 * 에뮬레이터가 꺼져 있으면 실패하지 않고 건너뛴다 (실행 방법: infra/firebase 에서 에뮬레이터 시작).
 */
@SpringBootTest
class FirestoreEmulatorConnectionTest {

    @Autowired
    Firestore firestore;

    @Autowired
    FirestoreProperties properties;

    @BeforeEach
    void 에뮬레이터가_켜져_있을_때만_실행한다() {
        assumeTrue(FirestoreEmulator.isRunning(properties), "에뮬레이터가 꺼져 있음");
    }

    @Test
    void 문서를_쓰고_다시_읽을_수_있다() throws Exception {
        DocumentReference doc = firestore.collection("_connection_test").document(UUID.randomUUID().toString());
        try {
            doc.set(Map.of("message", "hello")).get();

            DocumentSnapshot snapshot = doc.get().get();

            assertThat(snapshot.exists()).isTrue();
            assertThat(snapshot.getString("message")).isEqualTo("hello");
        } finally {
            doc.delete().get();
        }
    }
}
