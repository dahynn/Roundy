package com.ssafya701.roundy.user.dto.response;


import com.ssafya701.roundy.user.entity.User;
import com.ssafya701.roundy.user.enums.GenderType;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDate;

@Getter
@Builder
public class UserSignupDetailResponse {
    private String name;        // 카카오에서 가져온 이름
    private GenderType gender;  // 카카오에서 가져온 성별
    private LocalDate birthDate;// 카카오에서 가져온 생일

    public static UserSignupDetailResponse from(User user) {
        return UserSignupDetailResponse.builder()
                .name(user.getName())
                .gender(user.getGender())
                .birthDate(user.getBirthDate())
                .build();
    }
}
