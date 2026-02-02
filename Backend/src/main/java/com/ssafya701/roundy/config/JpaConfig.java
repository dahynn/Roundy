package com.ssafya701.roundy.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@Configuration
@EnableJpaAuditing // BaseEntity 사용하려고 작성함
public class JpaConfig {
}
