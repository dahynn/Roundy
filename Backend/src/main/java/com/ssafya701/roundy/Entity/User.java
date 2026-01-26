package com.ssafya701.roundy.Entity;


import com.fasterxml.jackson.annotation.JsonIgnore;
import com.ssafya701.roundy.Enums.GenderType;
import com.ssafya701.roundy.Enums.UserRole;
import com.ssafya701.roundy.Enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "users")
public class User {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long kakaoId;

    @JsonIgnore
    @Column(unique = true)
    private String email;

    @Column(nullable = false)
    private String name;

    private String nickname;

    @Enumerated(EnumType.STRING)
    private GenderType gender;

    private LocalDate birthDate;

    private String mbti;

    private String profilePhotoUrl;
    private String verificationPhotoUrl;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    private UserStatus status;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<UserPreference> userPreferences = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Builder
    public User(Long kakaoId, String email, String name, GenderType gender, LocalDate birthDate, UserStatus status, UserRole role) {
        this.kakaoId = kakaoId;
        this.email = email;
        this.name = name;
        this.gender = gender;
        this.birthDate = birthDate;
        this.status = status;
        this.role = role;
    }


    public void updateProfile(String nickname, GenderType gender, LocalDate birthDate, String mbti, String profilePhotoUrl) {
        this.nickname = nickname;
        this.gender = gender;
        this.birthDate = birthDate;
        this.mbti = mbti;
        this.profilePhotoUrl = profilePhotoUrl;
        // 상태 변경 로직
    }

    // 2단계: 취향 정보 입력 -> VALID
    public void addUserPreference(UserPreference userPreference) {
        this.userPreferences.add(userPreference);
        userPreference.assignUser(this);
    }

    // 3단계: 얼굴 인증 완료 -> APPROVED (서비스 이용 가능)
    public void approveFaceAuth(String verificationPhotoUrl) {
        this.verificationPhotoUrl = verificationPhotoUrl;
        this.status = UserStatus.APPROVED;
    }



    public void clearPreferences() {
        this.userPreferences.clear();
    }

    public String calculateNextStep() {
        return switch (this.status) {
            case JOINED -> "PROFILE";
            case VALID -> "FACE_AUTH";
            case APPROVED -> "MAIN";
            default -> "LOGIN";
        };
    }
}