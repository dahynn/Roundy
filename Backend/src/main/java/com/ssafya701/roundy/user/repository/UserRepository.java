package com.ssafya701.roundy.user.repository;

import com.ssafya701.roundy.user.entity.User;
import com.ssafya701.roundy.user.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByKakaoId(Long kakaoId);

    // 스케줄링 쿼리 GHOST USER을 처리하기 위함
    void deleteGhostUser(UserRole role, LocalDateTime createdAt);
}

