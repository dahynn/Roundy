package com.ssafya701.roundy.config;

import com.ssafya701.roundy.global.jwt.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.Arrays;

@Slf4j
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CorsConfigurationSource corsConfigurationSource;
    private final Environment environment;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        boolean isDevelopment = Arrays.asList(environment.getActiveProfiles())
                .stream()
                .anyMatch(profile -> profile.equals("local") || profile.equals("dev") || profile.equals("default"));

        log.info("🔒 Security 설정 - 개발 모드: {}, 활성 프로필: {}",
                isDevelopment, Arrays.toString(environment.getActiveProfiles()));
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource)) // CORS 설정 추가
                .csrf(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers(
                                "/api/webrtc/test/**", // 테스트용 WebRTC 토큰 발급 경로를 항상 허용
                                "/test/**",
                                "/api/test/**",
                                "/ws/**"
                        ).permitAll();

                    // 개발 환경에서만 테스트 페이지 허용
                    if (isDevelopment) {
                        log.info("✅ 개발 모드: 추가적인 테스트 페이지 접근 허용");
                    } else {
                        log.info("🔒 프로덕션 모드: 테스트 페이지 접근 차단");
                    }

                    auth.requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers(
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll();

                    auth.requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated();
                })

                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
