package com.ssafya701.roundy.webrtc.room;

import com.ssafya701.roundy.webrtc.room.enums.RotationMode;
import com.ssafya701.roundy.webrtc.rotation.RoundInfo;
import lombok.Getter;
import lombok.ToString;
import org.springframework.web.socket.WebSocketSession;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 방 상태 관리 (메모리)
 * 스레드 안전성을 위해 ConcurrentHashMap 사용
 * 
 * ERD 매핑: sessions 테이블과 대응
 * - roomId ↔ sessions.id
 * - mode ↔ WebRTC 전용 (DB에는 없음)
 * - openViduSessionId ↔ OpenVidu 전용
 * 
 * TODO: [DB 연동] 향후 추가할 필드
 * - Integer maleCount, femaleCount (실시간 인원수)
 * - Integer maleMax, femaleMax (DB sessions 테이블에서 가져옴)
 * - SessionStatus status (RECRUITING, ONGOING, CLOSED, CANCELLED)
 */
@Getter
@ToString
public class RoomState {
    private final String roomId;
    private final RotationMode mode;
    private final Map<Long, ParticipantState> participants;
    private final String openViduSessionId;
    private RoundInfo currentRound;
    
    // TODO: [DB 연동] 성별별 인원수 관리 필드 추가
    // private Integer maleCount = 0;
    // private Integer femaleCount = 0;
    // private Integer maleMax = 6;   // DB에서 가져옴
    // private Integer femaleMax = 6;  // DB에서 가져옴
    
    public RoomState(String roomId, RotationMode mode, String openViduSessionId) {
        this.roomId = roomId;
        this.mode = mode;
        this.openViduSessionId = openViduSessionId;
        this.participants = new ConcurrentHashMap<>();
        this.currentRound = null;
    }
    
    /**
     * 참가자 추가
     * 
     * TODO: [DB 연동] 성별별 인원수 증가
     * Gender gender = // DB users 테이블에서 조회
     * if (gender == MALE) maleCount++;
     * if (gender == FEMALE) femaleCount++;
     */
    public void addParticipant(Long userId, String nickname, WebSocketSession session) {
        participants.put(userId, new ParticipantState(userId, nickname, session, null));
        
        // TODO: [DB 연동] maleCount/femaleCount 증가 로직
    }
    
    /**
     * 참가자 제거
     * 
     * TODO: [DB 연동] 성별별 인원수 감소
     * Gender gender = removed.getGender(); // ParticipantState에 gender 필드 추가 필요
     * if (gender == MALE) maleCount--;
     * if (gender == FEMALE) femaleCount--;
     */
    public ParticipantState removeParticipant(Long userId) {
        ParticipantState removed = participants.remove(userId);
        
        // TODO: [DB 연동] maleCount/femaleCount 감소 로직
        
        return removed;
    }
    
    /**
     * 세션 ID로 참가자 찾기
     */
    public Optional<ParticipantState> findParticipantBySessionId(String sessionId) {
        return participants.values().stream()
                .filter(p -> p.getSessionId().equals(sessionId))
                .findFirst();
    }
    
    /**
     * 참가자 수 반환
     */
    public int getParticipantCount() {
        return participants.size();
    }
    
    /**
     * 모든 참가자 리스트 반환 (복사본)
     */
    public List<ParticipantState> getParticipantList() {
        return new ArrayList<>(participants.values());
    }
    
    /**
     * 특정 참가자 조회
     */
    public Optional<ParticipantState> getParticipant(Long userId) {
        return Optional.ofNullable(participants.get(userId));
    }
    
    /**
     * 라운드 정보 설정
     */
    public void setCurrentRound(RoundInfo roundInfo) {
        this.currentRound = roundInfo;
    }
    
    /**
     * 참가자의 OpenVidu 토큰 설정
     */
    public void setParticipantToken(Long userId, String token) {
        ParticipantState participant = participants.get(userId);
        if (participant != null) {
            participant.setOpenViduToken(token);
        }
    }
    
    /**
     * 방이 비어있는지 확인
     */
    public boolean isEmpty() {
        return participants.isEmpty();
    }
    
    /**
     * PAIR_ONLY 모드 여부
     */
    public boolean isPairMode() {
        return mode == RotationMode.PAIR_ONLY;
    }
    
    /**
     * 라운드 진행 중인지 확인
     */
    public boolean isRoundActive() {
        return currentRound != null;
    }
}
