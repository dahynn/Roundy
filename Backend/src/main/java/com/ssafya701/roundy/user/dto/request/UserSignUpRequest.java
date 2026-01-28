package com.ssafya701.roundy.user.dto.request;

import com.ssafya701.roundy.user.enums.GenderType;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@NoArgsConstructor
public class UserSignUpRequest {

    private String nickName;   // 닉네임
    private GenderType gender; // 성별
    private LocalDate birthDate; // 생일
    private String mbti;
}