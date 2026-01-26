package com.ssafya701.roundy.user.entity;

import com.ssafya701.roundy.user.enums.GenderType;
import com.ssafya701.roundy.user.enums.UserRole;
import com.ssafya701.roundy.user.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 카카오에서 받아온 정보
    @Column(unique = true, nullable = false)
    private Long kakaoId;

    private String name;
    private String email;

    @Enumerated(EnumType.STRING)
    private GenderType gender;

    private Integer birthYear;
    private String birthDay; // MMDD 형식

    // 회원가입에서 추가 정보
    private String profileImageUrl; // EC2 저장 경로 or URL
    private String nickName;
    private String mbti;


    @Enumerated(EnumType.STRING)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    private UserStatus status;

    @Builder
    public User(Long kakaoId, String name, String email, GenderType gender, Integer birthYear, String birthDay, UserRole role, UserStatus status) {
        this.kakaoId = kakaoId;
        this.name = name;
        this.email = email;
        this.gender = gender;
        this.birthYear = birthYear;
        this.birthDay = birthDay;
        this.role = role;
        this.status = status;
    }

    public void signUp(String nickName, GenderType gender, Integer birthYear, String birthDay, String mbti, String profileImageUrl) {
        this.nickName = nickName;
        this.gender = gender;
        this.birthYear = birthYear;
        this.birthDay = birthDay;
        this.mbti = mbti;
        if (profileImageUrl != null) {
            this.profileImageUrl = profileImageUrl;
        }

        this.status = UserStatus.JOINED;

    }

    public void updateStatus(UserStatus newStatus) {
        this.status = newStatus;
    }
}