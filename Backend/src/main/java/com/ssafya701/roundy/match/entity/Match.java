package com.ssafya701.roundy.match.entity;

import com.ssafya701.roundy.global.common.BaseEntity;
import com.ssafya701.roundy.match.enums.ChatStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "matches")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Match extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "male_id", nullable = false)
    private Long maleId;

    @Column(name = "female_id", nullable = false)
    private Long femaleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "chat_status", nullable = false)
    private ChatStatus chatStatus = ChatStatus.ACTIVE;

    // --- 퇴장 시간 (이력 관리용) ---
    @Column(name = "male_left_at")
    private LocalDateTime maleLeftAt;

    @Column(name = "female_left_at")
    private LocalDateTime femaleLeftAt;
    // ------

    // --- 목록 조회 최적화 (역정규화) ---
    // 메시지 테이블을 매번 조인하지 않고도 채팅 목록에서 마지막 대화 내용을 바로 보여줌
    @Column(name = "last_message_content", columnDefinition = "TEXT")
    private String lastMessageContent;

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;
    // ------

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Builder
    public Match(Long sessionId, Long maleId, Long femaleId) {
        this.sessionId = sessionId;
        this.maleId = maleId;
        this.femaleId = femaleId;
        this.chatStatus = ChatStatus.ACTIVE;
    }

    // --- 비즈니스 로직 메서드 ---

    /**
     * 채팅 종료 및 사용자별 나간 시간 기록
     * 한 명이라도 나갈 경우 ChatStatus는 TERMINATED로 변경됨
     * */
    public void terminateChat(Long userId) {
        this.chatStatus = ChatStatus.TERMINATED;

        if (userId.equals(this.maleId)) {
            this.maleLeftAt = LocalDateTime.now();
        } else if (userId.equals(this.femaleId)) {
            this.femaleLeftAt = LocalDateTime.now();
        }
    }

    /**
     * 최근 메시지 동기화 (메시지 전송 시 호출)
     * 채팅 목록 상단 노출 및 미리보기용
     * */
    public void updateLastMessage(String content, LocalDateTime sentAt) {
        this.lastMessageContent = content;
        this.lastMessageAt = sentAt;
    }

    /**
     * 매칭 내역 논리 삭제 (Soft Delete)
     * */
    public void markAsDeleted() {
        this.deletedAt = LocalDateTime.now();
    }
}
