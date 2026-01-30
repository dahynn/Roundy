package com.ssafya701.roundy.chatmessage.repository;

import com.ssafya701.roundy.chatmessage.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    /**
     * 사용자가 채팅방 진입 시 최근 메시지 N개 조회
     * 최신순(ID DESC)으로 조회하므로, 프론트 전달 전 리스트 역정렬 필요함
     * */
    List<ChatMessage> findByMatchIdOrderByIdDesc(Long matchId, Pageable pageable);

    /**
     * DB 커서 기반 새 메시지 조회 (폴링용)
     * 마지막으로 받은 메시지(lastMessageId)를 기준으로 그 이후의 신규 메시지만 오름차순으로 반환
     * */
    List<ChatMessage> findByMatchIdAndIdGreaterThanOrderByIdAsc(Long matchId, Long lastMessageId);

    /**
     * 사용자가 모두 나간 특정 방의 메시지 전체 삭제
     * */
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM ChatMessage cm WHERE cm.matchId = :matchId")
    void deleteAllByMatchId(@Param("matchId") Long matchId);

}