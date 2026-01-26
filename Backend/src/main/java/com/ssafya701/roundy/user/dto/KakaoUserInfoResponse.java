package com.ssafya701.roundy.user.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

// 카카오 API(v2/user/me)를 통해 받아오는 사용자 정보를 담는 객체
@Data
@NoArgsConstructor
public class KakaoUserInfoResponse {

    private Long id; // 카카오 회원 번호 (고유 ID)

    @JsonProperty("connected_at")
    private String connectedAt;

    @JsonProperty("kakao_account")
    private KakaoAccount kakaoAccount;

    @Data
    @NoArgsConstructor
    public static class KakaoAccount {

        // 프로필 정보 (닉네임, 사진)
        private Profile profile;

        // 이메일
        private String email;
        @JsonProperty("has_email")
        private Boolean hasEmail;

        // 성별 ("male", "female")
        private String gender;
        @JsonProperty("has_gender")
        private Boolean hasGender;

        // 생일 ("MMDD")
        private String birthday;
        @JsonProperty("has_birthday")
        private Boolean hasBirthday;

        // 출생연도 ("YYYY")
        private String birthyear;
        @JsonProperty("has_birthyear")
        private Boolean hasBirthyear;

        @Data
        @NoArgsConstructor
        public static class Profile {
            private String nickname;

            @JsonProperty("thumbnail_image_url")
            private String thumbnailImageUrl;

            @JsonProperty("profile_image_url")
            private String profileImageUrl;
        }
    }
}