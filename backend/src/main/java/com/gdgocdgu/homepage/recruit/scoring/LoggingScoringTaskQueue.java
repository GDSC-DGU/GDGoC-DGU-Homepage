package com.gdgocdgu.homepage.recruit.scoring;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 채점 작업을 큐에 넣는 대신 로그만 남기는 구현.
 * 실제 큐(Cloud Tasks) 구현이 추가되기 전까지 RCT-005 쪽이 {@link ScoringTaskQueue}를 호출해 볼 수 있게 한다.
 * 로그에는 {@code aid}와 {@code criteriaVersion}만 남기고 개인정보는 남기지 않는다.
 */
@Component
public class LoggingScoringTaskQueue implements ScoringTaskQueue {

    private static final Logger log = LoggerFactory.getLogger(LoggingScoringTaskQueue.class);

    @Override
    public void enqueue(String aid, int criteriaVersion) {
        if (aid == null || aid.isBlank() || criteriaVersion < 1) {
            // 잘못된 입력이어도 예외를 던지지 않는다. 멈춘 지원서는 RCT-031이 다시 넣는다.
            log.warn("채점 작업 등록 건너뜀: 잘못된 입력 (aid={}, criteriaVersion={})", aid, criteriaVersion);
            return;
        }
        log.info("채점 작업 등록(로그만): aid={}, criteriaVersion={}", aid, criteriaVersion);
    }
}
