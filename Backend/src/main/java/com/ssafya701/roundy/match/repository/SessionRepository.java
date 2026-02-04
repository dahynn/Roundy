package com.ssafya701.roundy.match.repository;

import com.ssafya701.roundy.match.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findByRoomId(String roomId);
}
