package com.ssafya701.roundy.match.repository;

import com.ssafya701.roundy.match.entity.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MatchRepository extends JpaRepository<Match, Long> {

    /**
     * 내 쪽지함 목록 조회 (마지막 메시지 시간 기준 => 내림차순)
     * 삭제되지 않은 방만 조회
     * */
    @Query("SELECT m FROM Match m " +
            "WHERE (m.maleId = :userId OR m.femaleId = :userId) " +
            "AND m.deletedAt IS NULL " +
            "ORDER BY m.lastMessageAt DESC")
    List<Match> findMyMatches(@Param("userId") Long userId);

}
