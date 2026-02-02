package com.ssafya701.roundy.auth.entity;

import com.ssafya701.roundy.global.common.BaseEntity;
import com.ssafya701.roundy.auth.enums.GenderType;
import com.ssafya701.roundy.auth.enums.UserRole;
import com.ssafya701.roundy.auth.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "users")
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private Long kakaoId;

    private String name;
    private String email;

    @Enumerated(EnumType.STRING)
    private GenderType gender;

    private LocalDate birthDate;
    private String nickName;
    private String profileImageUrl;
    private String mbti;
    private String verificationImageUrl;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50)
    private UserStatus status;

    @Builder
    public User(Long kakaoId, String name, String email, GenderType gender, LocalDate birthDate, UserRole role,
            UserStatus status) {
        this.kakaoId = kakaoId;
        this.name = name;
        this.email = email;
        this.gender = gender;
        this.birthDate = birthDate;
        this.role = role;
        this.status = status;
    }

    // 회원가입: 추가 정보 저장 및 상태 변경
    public void signUp(String nickName, GenderType gender, LocalDate birthDate, String mbti, String profileImageUrl) {
        this.nickName = nickName;
        this.gender = gender;
        this.birthDate = birthDate;
        this.mbti = mbti;
        if (profileImageUrl != null) {
            this.profileImageUrl = profileImageUrl;
        }
        this.status = UserStatus.JOINED;
    }

    // 검증용 사진 업로드
    public void uploadVerificationImage(String verificationImageUrl) {
        this.verificationImageUrl = verificationImageUrl;
        this.status = UserStatus.PENDING_VERIFICATION;
    }

    // 취향 분석 -> 최종 승인
    public void authorizeUser() {
        this.role = UserRole.USER;
        this.status = UserStatus.VALID;
    }
}