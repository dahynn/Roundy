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
                // 개발 환경인지 확인 (local, dev, default 프로필일 경우 true)
                boolean isDevelopment = Arrays.stream(environment.getActiveProfiles())
                                .anyMatch(profile -> profile.equals("local") || profile.equals("dev")
                                                || profile.equals("default"));

                log.info("🔒 Security 설정 - 개발 모드: {}, 활성 프로필: {}",
                                isDevelopment, Arrays.toString(environment.getActiveProfiles()));

                http
                                .cors(cors -> cors.configurationSource(corsConfigurationSource)) // CORS 설정
                                .csrf(AbstractHttpConfigurer::disable)
                                .formLogin(AbstractHttpConfigurer::disable)
                                .httpBasic(AbstractHttpConfigurer::disable)
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // 세션 안 씀 (JWT
                                                                                                         // 사용)

                                .authorizeHttpRequests(auth -> {
                                        auth.requestMatchers(
                                                        "/api/auth/signup/details",
                                                        "/api/auth/verify", // 사진 인증
                                                        "/api/auth/onboarding", // 온보딩(취향 입력)
                                                        "/api/auth/logout", // 로그아웃
                                                        "/api/auth/withdraw" // 회원탈퇴
                                        ).authenticated();

                                        // auth.requestMatchers("/api/auth/**").permitAll(); // 🚨 기존의 너무 관대한 설정 제거

                                        auth.requestMatchers(
                                                        "/api/auth/login",
                                                        "/api/auth/kakao/callback",
                                                        "/api/auth/re-issue",
                                                        "/api/preferences/**").permitAll();

                                        auth.requestMatchers(
                                                        "/api/webrtc/test/**",
                                                        "/test/**",
                                                        "/api/test/**",
                                                        "/ws/**").permitAll();

                                        // 개발 환경 로그
                                        if (isDevelopment) {
                                                log.info("✅ 개발 모드: 추가적인 테스트 페이지 접근 허용");
                                        } else {
                                                log.info("🔒 프로덕션 모드: 테스트 페이지 접근 차단");
                                        }

                                        auth.requestMatchers(
                                                        "/v3/api-docs/**",
                                                        "/swagger-ui/**",
                                                        "/swagger-ui.html").permitAll();

                                        auth.requestMatchers("/api/admin/**").hasRole("ADMIN")
                                                        .anyRequest().authenticated();
                                })

                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }
}