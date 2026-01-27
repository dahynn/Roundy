package com.ssafya701.roundy.chatmessage.entity;


import com.ssafya701.roundy.global.common.BaseEntity;
import com.ssafya701.roundy.chatmessage.enums.MsgType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "chat_messages", indexes = {
        @Index(name = "idx_match_id_id_desc", columnList = "match_id, id DESC") // 폴링 성능 최적화
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatMessage extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "match_id", nullable = false)
    private Long matchId;

    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Column(name = "receiver_id", nullable = false)
    private Long receiverId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "msg_type", nullable = false, length = 20)
    private MsgType msgType;

    @Column(name = "is_read")
    private boolean isRead = false;

    @Builder
    public ChatMessage(Long matchId, Long senderId, Long receiverId, String content, MsgType msgType) {
        this.matchId = matchId;
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.content = content;
        this.msgType = msgType;
    }
}
