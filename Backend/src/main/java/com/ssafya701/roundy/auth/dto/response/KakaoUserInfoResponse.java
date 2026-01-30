package com.ssafya701.roundy.auth.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class KakaoUserInfoResponse {

    private Long id;

    @JsonProperty("kakao_account")
    private KakaoAccount kakaoAccount;

    @Data
    @NoArgsConstructor
    public static class KakaoAccount {
        private String email;
        private String name;

        private String gender;
        private String birthday;
        private String birthyear;


    }
}