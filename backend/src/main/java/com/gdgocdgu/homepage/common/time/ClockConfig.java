package com.gdgocdgu.homepage.common.time;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** 현재 시각은 이 Clock으로 얻는다. 테스트에서 고정 시각으로 바꿔 끼우기 위함이다. */
@Configuration
public class ClockConfig {

    @Bean
    Clock clock() {
        return Clock.system(KstTime.ZONE);
    }
}
