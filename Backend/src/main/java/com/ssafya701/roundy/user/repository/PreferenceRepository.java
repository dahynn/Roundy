package com.ssafya701.roundy.user.repository;

import com.ssafya701.roundy.preference.entity.Preference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PreferenceRepository extends JpaRepository<Preference, Long> {
    List<Preference> findAll();
}
