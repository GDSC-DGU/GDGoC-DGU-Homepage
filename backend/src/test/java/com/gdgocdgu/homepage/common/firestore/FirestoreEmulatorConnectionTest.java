package com.gdgocdgu.homepage.common.firestore;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
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
        assumeTrue(properties.usesEmulator(), "에뮬레이터 설정이 없는 프로필");
        assumeTrue(isReachable(properties.emulatorHost()), "에뮬레이터가 꺼져 있음: " + properties.emulatorHost());
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

    private static boolean isReachable(String hostPort) {
        int colon = hostPort.lastIndexOf(':');
        String host = hostPort.substring(0, colon);
        int port = Integer.parseInt(hostPort.substring(colon + 1));
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), 500);
            return true;
        } catch (IOException e) {
            return false;
        }
    }
}
