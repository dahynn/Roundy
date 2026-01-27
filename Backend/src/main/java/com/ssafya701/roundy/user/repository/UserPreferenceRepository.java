package com.ssafya701.roundy.user.repository;

import com.ssafya701.roundy.user.entity.UserPreference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserPreferenceRepository extends JpaRepository<UserPreference, Long> {
    List<UserPreference> findByUserId(Long userId);

    void deleteByUserId(Long userId);
}
