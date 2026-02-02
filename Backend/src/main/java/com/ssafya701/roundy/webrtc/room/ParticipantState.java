package com.ssafya701.roundy.webrtc.room;

import com.ssafya701.roundy.webrtc.room.enums.Gender;
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
 * - gender ↔ users.gender (성별별 인원수 관리)
 */
@Getter
@ToString
public class ParticipantState {
    private final Long userId;
    private final String nickname;
    private final Gender gender;  // 성별 (MALE/FEMALE)
    private WebSocketSession session;  // final 제거 (재연결 시 업데이트 가능)
    private String openViduToken;
    
    public ParticipantState(Long userId, String nickname, Gender gender, 
                            WebSocketSession session, String openViduToken) {
        this.userId = userId;
        this.nickname = nickname;
        this.gender = gender;
        this.session = session;
        this.openViduToken = openViduToken;
    }
    
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
    
    /**
     * 세션 업데이트 (재연결 시)
     */
    public void updateSession(WebSocketSession newSession) {
        this.session = newSession;
    }
}
