package com.gdgocdgu.homepage.common.config;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.FirestoreOptions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;

@Configuration(proxyBeanMethods = false)
class FirestoreConfig {

    @Bean
    @Lazy
    Firestore firestore() {
        return FirestoreOptions.getDefaultInstance().getService();
    }
}
