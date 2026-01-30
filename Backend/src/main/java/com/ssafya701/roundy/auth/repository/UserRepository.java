package com.ssafya701.roundy.auth.repository;

import com.ssafya701.roundy.auth.entity.User;
import com.ssafya701.roundy.auth.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByKakaoId(Long kakaoId);

    // GHOST USER을 처리하기 위함
    // 카카오 로그인만 하고 회원가입(추가 정보 기입) 안한 사람들
    void deleteByRoleAndCreatedAtBefore(UserRole role, LocalDateTime createdAt);
}

