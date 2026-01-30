package com.ssafya701.roundy.auth.dto.response;


import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

// 카카오 인증 서버에서 인가 코드 주고 받아오는 토큰 응답 객체
@Data
@NoArgsConstructor
public class KakaoTokenResponse {

    @JsonProperty("access_token")
    private String accessToken;

    @JsonProperty("token_type")
    private String tokenType;

    @JsonProperty("refresh_token")
    private String refreshToken;

    @JsonProperty("expires_in")
    private int expiresIn;

    @JsonProperty("scope")
    private String scope;

    @JsonProperty("refresh_token_expires_in")
    private int refreshTokenExpiresIn;
}