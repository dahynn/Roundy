package com.ssafya701.roundy.match.repository;

import com.ssafya701.roundy.match.entity.RoomParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoomParticipantRepository extends JpaRepository<RoomParticipant, Long> {
    Optional<RoomParticipant> findTopByRoomIdAndUserIdOrderByJoinedAtDesc(String roomId, Long userId);
}
