package com.ssafya701.roundy.webrtc.room;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.ToString;
import org.springframework.web.socket.WebSocketSession;

/**
 * 참가자 상태 정보 (메모리)
 * 
 * ERD 매핑: participants 테이블과 대응
 * - userId ↔ participants.user_id
 * - nickname ↔ users.nickname (DB에서 조회 필요)
 * 
 * TODO: [DB 연동] 향후 추가할 필드
 * - Gender gender (users 테이블에서 조회, 인원수 관리에 필요)
 */
@Getter
@AllArgsConstructor
@ToString
public class ParticipantState {
    private final Long userId;
    private final String nickname;
    private final WebSocketSession session;
    private String openViduToken;
    
    // TODO: [DB 연동] 성별 필드 추가
    // private final Gender gender;  // users 테이블에서 조회
    
    /**
     * OpenVidu 토큰 설정
     */
    public void setOpenViduToken(String token) {
        this.openViduToken = token;
    }
    
    /**
     * 세션 ID 반환
     */
    public String getSessionId() {
        return session.getId();
    }
    
    /**
     * 세션 활성화 여부 확인
     */
    public boolean isSessionOpen() {
        return session.isOpen();
    }
}
