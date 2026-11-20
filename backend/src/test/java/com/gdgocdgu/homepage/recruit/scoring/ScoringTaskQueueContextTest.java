package com.gdgocdgu.homepage.recruit.scoring;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * RCT-005 같은 다른 코드가 {@link ScoringTaskQueue}를 주입받아 쓸 수 있는지 확인한다.
 * Firestore 클라이언트는 첫 요청 때 연결하므로 에뮬레이터 없이도 실행된다.
 */
@SpringBootTest
class ScoringTaskQueueContextTest {

    @Autowired
    ScoringTaskQueue scoringTaskQueue;

    @Test
    void ScoringTaskQueue_빈을_주입받을_수_있다() {
        assertThat(scoringTaskQueue).isInstanceOf(LoggingScoringTaskQueue.class);
    }
}
