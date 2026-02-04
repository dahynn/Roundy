package com.ssafya701.roundy.auth.dto.response;

import com.ssafya701.roundy.auth.entity.User;
import com.ssafya701.roundy.auth.enums.GenderType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Builder
public class UserResponse {
    private Long id;
    private String name;
    private String email;
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
                .email(user.getEmail())
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