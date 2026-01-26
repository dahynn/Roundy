package com.ssafya701.roundy.Repository;

import com.ssafya701.roundy.Entity.Preference;
import com.ssafya701.roundy.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByKakaoId(Long kakaoId);
}

