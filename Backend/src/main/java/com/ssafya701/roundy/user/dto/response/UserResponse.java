package com.ssafya701.roundy.user.dto.response;

import com.ssafya701.roundy.user.entity.User;
import com.ssafya701.roundy.user.enums.GenderType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class UserResponse {
    private Long id;
    private String name;
    private LocalDate birthDate;
    private GenderType gender;
    private String nickname;
    private String profileImageUrl;
    private String verificationImageUrl;
    private String role;
    private String status;

    public static UserResponse from(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .birthDate(user.getBirthDate())
                .gender(user.getGender())
                .nickname(user.getNickName())
                .profileImageUrl(user.getProfileImageUrl())
                .verificationImageUrl(user.getVerificationImageUrl())
                .role(user.getRole().name())
                .status(user.getStatus().name())
                .build();
    }
}