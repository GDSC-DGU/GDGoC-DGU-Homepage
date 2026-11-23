package com.gdgocdgu.homepage.recruit;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Base64;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 중복 지원 방지 키의 문서 ID를 만든다 (rct-data-model.md 3-4).
 * 학번은 경우의 수가 적어 단순 해시는 되돌리기 쉬우므로 서버 비밀 키로 HMAC-SHA256을 쓴다.
 * 비밀 키를 바꾸면 기존 키와 맞지 않아 중복 검사가 깨지므로 모집 중에는 바꾸지 않는다.
 */
@Component
public class ApplicationKeyGenerator {

    private static final String ALGORITHM = "HmacSHA256";
    private static final int MIN_SECRET_BYTES = 32;

    private final SecretKeySpec secretKey;

    ApplicationKeyGenerator(@Value("${RECRUIT_KEY_HMAC_SECRET:}") String secret) {
        // 비어 있어도 서버는 시작한다. 이 키를 쓰는 지원 API만 실패한다.
        this.secretKey = secret.isBlank() ? null : createKey(secret);
    }

    /** @param normalizedStudentId 정규화된 학번. 예외 메시지와 로그에 넣지 않는다. */
    String studentIdKey(String normalizedStudentId) {
        return "sid_" + hmac(normalizedStudentId);
    }

    private String hmac(String value) {
        if (secretKey == null) {
            throw new IllegalStateException("RECRUIT_KEY_HMAC_SECRET이 설정되지 않았습니다.");
        }
        try {
            Mac mac = Mac.getInstance(ALGORITHM); // Mac은 스레드 안전하지 않아 호출마다 만든다.
            mac.init(secretKey);
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("중복 방지 키를 만들 수 없습니다.", e);
        }
    }

    private static SecretKeySpec createKey(String secret) {
        byte[] key;
        try {
            key = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("RECRUIT_KEY_HMAC_SECRET은 Base64 문자열이어야 합니다.");
        }
        if (key.length < MIN_SECRET_BYTES) {
            throw new IllegalArgumentException("RECRUIT_KEY_HMAC_SECRET은 디코딩 후 최소 32바이트여야 합니다.");
        }
        return new SecretKeySpec(key, ALGORITHM);
    }
}
