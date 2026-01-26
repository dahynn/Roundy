package com.ssafya701.roundy.user.dto.response;

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
        private Profile profile;

        private String gender;
        private String birthday;
        private String birthyear;

        // 카카오에서 name을 nickname으로 전달해줌
        // 우리 로직의 nickname과 다른 변수임!!
        @Data
        @NoArgsConstructor
        public static class Profile {
            private String nickname;
        }
    }
}