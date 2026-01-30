package com.ssafya701.roundy.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Slf4j
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        log.info("CORS 설정 활성화: 모든 Origin에 대해 허용 (개발용 설정)");

        CorsConfiguration configuration = new CorsConfiguration();
        
        // "file://" 프로토콜과 같은 'null' origin을 포함한 모든 origin을 허용하기 위해
        // allowedOriginPatterns("*")를 사용합니다.
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
