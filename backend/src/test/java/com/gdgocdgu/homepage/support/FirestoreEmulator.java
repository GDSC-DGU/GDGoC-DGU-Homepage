package com.gdgocdgu.homepage.support;

import com.gdgocdgu.homepage.common.firestore.FirestoreProperties;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

/**
 * 에뮬레이터를 쓰는 테스트의 공통 도우미.
 * - 에뮬레이터가 꺼져 있으면 테스트를 건너뛰게 한다(로컬). CI는 에뮬레이터를 띄운 채 돌린다.
 * - 테스트끼리 데이터가 섞이지 않게 에뮬레이터의 모든 문서를 지운다.
 */
public final class FirestoreEmulator {

    private FirestoreEmulator() {
    }

    public static boolean isRunning(FirestoreProperties properties) {
        if (!properties.usesEmulator()) {
            return false;
        }
        String hostPort = properties.emulatorHost();
        int colon = hostPort.lastIndexOf(':');
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(hostPort.substring(0, colon),
                    Integer.parseInt(hostPort.substring(colon + 1))), 500);
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    /** 에뮬레이터 전용 API로 (default) 데이터베이스의 모든 문서를 지운다. 실제 Firestore에는 이 주소가 없다. */
    public static void clear(FirestoreProperties properties) throws IOException, InterruptedException {
        URI uri = URI.create("http://" + properties.emulatorHost() + "/emulator/v1/projects/"
                + properties.projectId() + "/databases/(default)/documents");
        try (HttpClient client = HttpClient.newHttpClient()) {
            HttpResponse<Void> response = client.send(HttpRequest.newBuilder(uri).DELETE().build(),
                    HttpResponse.BodyHandlers.discarding());
            if (response.statusCode() != 200) {
                throw new IllegalStateException("에뮬레이터 데이터 삭제 실패: " + response.statusCode());
            }
        }
    }
}
