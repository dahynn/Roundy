package com.ssafya701.roundy.Repository;

import com.ssafya701.roundy.Entity.Preference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PreferenceRepository extends JpaRepository<Preference, Long> {
    List<Preference> findAll();
}
