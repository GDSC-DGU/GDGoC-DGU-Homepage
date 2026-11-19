package com.gdgocdgu.homepage.recruit.scoring;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

@ExtendWith(OutputCaptureExtension.class)
class LoggingScoringTaskQueueTest {

    private final ScoringTaskQueue queue = new LoggingScoringTaskQueue();

    @Test
    void 올바른_입력이면_aid와_기준_버전을_로그로_남긴다(CapturedOutput output) {
        queue.enqueue("a_7f3c", 2);

        assertThat(output.getAll())
                .contains("aid=a_7f3c")
                .contains("criteriaVersion=2")
                .doesNotContain("WARN");
    }

    @Test
    void aid가_null이면_예외_없이_경고를_남긴다(CapturedOutput output) {
        assertThatCode(() -> queue.enqueue(null, 1)).doesNotThrowAnyException();

        assertThat(output.getAll()).contains("WARN").contains("잘못된 입력");
    }

    @Test
    void aid가_공백이면_예외_없이_경고를_남긴다(CapturedOutput output) {
        assertThatCode(() -> queue.enqueue("  ", 1)).doesNotThrowAnyException();

        assertThat(output.getAll()).contains("WARN").contains("잘못된 입력");
    }

    @Test
    void 기준_버전이_0이면_예외_없이_경고를_남긴다(CapturedOutput output) {
        assertThatCode(() -> queue.enqueue("a_7f3c", 0)).doesNotThrowAnyException();

        assertThat(output.getAll()).contains("WARN").contains("잘못된 입력");
    }

    @Test
    void 기준_버전이_음수여도_예외_없이_경고를_남긴다(CapturedOutput output) {
        assertThatCode(() -> queue.enqueue("a_7f3c", -1)).doesNotThrowAnyException();

        assertThat(output.getAll()).contains("WARN").contains("잘못된 입력");
    }
}
