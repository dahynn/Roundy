package com.ssafya701.roundy.match.entity;

import com.ssafya701.roundy.global.common.BaseEntity;
import com.ssafya701.roundy.match.enums.SessionStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "sessions")
public class Session extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_id", unique = true, nullable = false)
    private String roomId; // UUID string from Redis matching

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SessionStatus status;

    @Column(name = "male_max")
    private Integer maleMax;

    @Column(name = "female_max")
    private Integer femaleMax;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    @Builder
    public Session(String roomId, SessionStatus status, Integer maleMax, Integer femaleMax) {
        this.roomId = roomId;
        this.status = status;
        this.maleMax = maleMax;
        this.femaleMax = femaleMax;
    }

    public void updateStatus(SessionStatus status) {
        this.status = status;
        if (status == SessionStatus.CLOSED || status == SessionStatus.CANCELLED) {
            this.finishedAt = LocalDateTime.now();
        }
    }
}
