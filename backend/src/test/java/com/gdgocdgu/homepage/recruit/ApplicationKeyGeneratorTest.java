package com.gdgocdgu.homepage.recruit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Base64;
import org.junit.jupiter.api.Test;

class ApplicationKeyGeneratorTest {

    /** 0x00 ~ 0x1f 32바이트. 기대값은 Python hmac으로 따로 계산했다. */
    static final String SECRET = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";
    static final String KEY_OF_2023123456 =
            "sid_0e315c8427337d619757d70918b36a5e163d78a7eb51d9904bd2f9791e606e62";
    static final String KEY_OF_HONG_EMAIL =
            "email_1f1e8db1c5061ee4c35771acf477bfda55ba05ab4326552a392c3e035c3990fb";

    @Test
    void 학번_키는_HMAC_SHA256_값이다() {
        assertThat(new ApplicationKeyGenerator(SECRET).studentIdKey("2023123456")).isEqualTo(KEY_OF_2023123456);
    }

    @Test
    void 이메일_키는_email_접두어의_HMAC_SHA256_값이다() {
        assertThat(new ApplicationKeyGenerator(SECRET).emailKey("hong@dgu.ac.kr")).isEqualTo(KEY_OF_HONG_EMAIL);
    }

    @Test
    void 비밀_키가_다르면_다른_키가_나온다() {
        String otherSecret = Base64.getEncoder().encodeToString(new byte[32]);

        assertThat(new ApplicationKeyGenerator(otherSecret).studentIdKey("2023123456"))
                .isNotEqualTo(KEY_OF_2023123456);
    }

    @Test
    void 비밀_키가_없어도_서버는_시작하고_키를_만들_때_실패한다() {
        ApplicationKeyGenerator generator = new ApplicationKeyGenerator("");

        assertThatThrownBy(() -> generator.studentIdKey("2023123456"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageNotContaining("2023123456");
    }

    @Test
    void 비밀_키가_Base64가_아니면_시작할_때_실패한다() {
        assertThatThrownBy(() -> new ApplicationKeyGenerator("not base64!"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void 비밀_키가_32바이트보다_짧으면_시작할_때_실패한다() {
        String shortSecret = Base64.getEncoder().encodeToString(new byte[31]);

        assertThatThrownBy(() -> new ApplicationKeyGenerator(shortSecret))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
