package com.ssafya701.roundy.auth.service;

import com.ssafya701.roundy.auth.dto.response.KakaoTokenResponse;
import com.ssafya701.roundy.auth.dto.response.KakaoUserInfoResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.client.WebClient;

@Slf4j
@Service
@RequiredArgsConstructor
public class KakaoService {

    @Value("${kakao.client-id}") private String clientId;
    @Value("${kakao.redirect-uri}") private String redirectUri;
    @Value("${kakao.admin-key}") private String adminKey;
    @Value("${kakao.secret-key}") private String secretKey;

    private final WebClient webClient = WebClient.builder()
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE)
            .build();

    public String getAccessToken(String code) {


        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", clientId);
        params.add("redirect_uri", redirectUri);
        params.add("code", code);
        params.add("client_secret", secretKey);

        KakaoTokenResponse response = webClient.post()
                .uri("https://kauth.kakao.com/oauth/token")
                .bodyValue(params)
                .retrieve()
                .bodyToMono(KakaoTokenResponse.class).block();

        return response.getAccessToken();
    }

    public KakaoUserInfoResponse getUserInfo(String accessToken) {
        return webClient.get()
                .uri("https://kapi.kakao.com/v2/user/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .bodyToMono(KakaoUserInfoResponse.class).block();
    }

    public void unlink(Long kakaoId) {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("target_id_type", "user_id");
        params.add("target_id", String.valueOf(kakaoId));

        try {
            webClient.post()
                    .uri("https://kapi.kakao.com/v1/user/unlink")
                    .header(HttpHeaders.AUTHORIZATION, "KakaoAK " + adminKey) // 핵심: KakaoAK 사용
                    .bodyValue(params)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(); // 결과 받을때까지 기다리기 -> 동기적으로 처리함

            log.info("카카오 연결 끊기 성공. target_id: {}", kakaoId);

        } catch (Exception e) {
            // 연결 끊기에 실패하더라도 우리 DB에서의 탈퇴는 진행되어야 하므로 로그만 찍음
            log.error("카카오 연결 끊기 실패 (하지만 회원탈퇴는 진행됨): {}", e.getMessage());
        }
    }

}