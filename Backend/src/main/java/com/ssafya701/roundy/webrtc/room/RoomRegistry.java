package com.ssafya701.roundy.webrtc.room;

import com.ssafya701.roundy.webrtc.room.enums.RotationMode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 방 상태 레지스트리
 * 모든 방의 상태를 관리하는 중앙 저장소
 * 스레드 안전성 보장
 */
@Slf4j
@Component
public class RoomRegistry {
    private final Map<String, RoomState> rooms = new ConcurrentHashMap<>();
    
    /**
     * 방 생성 또는 조회
     * 
     * TODO: [DB 연동] sessions 테이블 연동
     * - DB에서 session 조회 (status가 RECRUITING 또는 ONGOING인지 확인)
     * - 없으면 DB에 새 session INSERT (status=RECRUITING)
     * - male_max, female_max 값 가져오기
     * 
     * 예시:
     * Session dbSession = sessionRepository.findById(roomId)
     *     .orElseGet(() -> sessionRepository.save(new Session(roomId, RECRUITING, 6, 6)));
     */
    public RoomState getOrCreateRoom(String roomId, RotationMode mode, String openViduSessionId) {
        return rooms.computeIfAbsent(roomId, id -> {
            log.info("새로운 방 생성: roomId={}, mode={}, sessionId={}", roomId, mode, openViduSessionId);
            
            // TODO: [DB 연동] DB에서 조회한 male_max, female_max를 RoomState에 전달
            return new RoomState(roomId, mode, openViduSessionId);
        });
    }
    
    /**
     * 방 조회
     */
    public Optional<RoomState> getRoom(String roomId) {
        return Optional.ofNullable(rooms.get(roomId));
    }
    
    /**
     * 참가자 추가
     * 
     * TODO: [DB 연동] users 및 participants 테이블 연동
     * 1. users 테이블에서 nickname, gender 조회
     *    User user = userRepository.findById(userId).orElseThrow();
     * 
     * 2. 성별별 인원수 검증 (male_max, female_max)
     *    if (user.getGender() == MALE && room.getMaleCount() >= room.getMaleMax()) {
     *        throw new BusinessLogicException("남자 정원 초과");
     *    }
     * 
     * 3. participants 테이블에 INSERT
     *    participantRepository.save(new Participant(sessionId, userId));
     * 
     * 4. sessions.status 업데이트 (남녀 모두 max 도달 시 RECRUITING → ONGOING)
     */
    public void addParticipant(String roomId, Long userId, String nickname, WebSocketSession session) {
        RoomState room = rooms.get(roomId);
        if (room == null) {
            log.warn("존재하지 않는 방에 참가자 추가 시도: roomId={}", roomId);
            return;
        }
        
        // TODO: [DB 연동] 위 주석 참고하여 구현
        
        room.addParticipant(userId, nickname, session);
        log.info("참가자 추가: roomId={}, userId={}, nickname={}, 현재 인원={}", 
                roomId, userId, nickname, room.getParticipantCount());
    }
    
    /**
     * 참가자 제거
     * 
     * TODO: [DB 연동] participants 및 sessions 테이블 연동
     * 1. participants 테이블에서 DELETE
     *    participantRepository.deleteBySessionIdAndUserId(roomId, userId);
     * 
     * 2. 남은 인원 확인 후 sessions.status 업데이트
     *    - 한 쪽 성별이 0명이 되면 status = CANCELLED
     *    - 양쪽 모두 0명이면 status = CLOSED, finished_at = NOW()
     * 
     * 3. matches 테이블 업데이트 (해당 유저가 포함된 매칭)
     *    - chat_status = TERMINATED
     *    - male_left_at or female_left_at = NOW()
     */
    public void removeParticipant(String roomId, Long userId) {
        RoomState room = rooms.get(roomId);
        if (room == null) {
            log.warn("존재하지 않는 방에서 참가자 제거 시도: roomId={}", roomId);
            return;
        }
        
        ParticipantState removed = room.removeParticipant(userId);
        if (removed != null) {
            log.info("참가자 제거: roomId={}, userId={}, 남은 인원={}", 
                    roomId, userId, room.getParticipantCount());
            
            // TODO: [DB 연동] 위 주석 참고하여 구현
        }
        
        // 방이 비었으면 삭제
        if (room.isEmpty()) {
            removeRoom(roomId);
        }
    }
    
    /**
     * 세션 ID로 참가자가 속한 방 찾기
     */
    public Optional<RoomState> findRoomBySessionId(String sessionId) {
        return rooms.values().stream()
                .filter(room -> room.findParticipantBySessionId(sessionId).isPresent())
                .findFirst();
    }
    
    /**
     * 세션 ID로 참가자 제거
     */
    public void removeParticipantBySessionId(String sessionId) {
        Optional<RoomState> roomOpt = findRoomBySessionId(sessionId);
        if (roomOpt.isPresent()) {
            RoomState room = roomOpt.get();
            Optional<ParticipantState> participantOpt = room.findParticipantBySessionId(sessionId);
            if (participantOpt.isPresent()) {
                removeParticipant(room.getRoomId(), participantOpt.get().getUserId());
            }
        }
    }
    
    /**
     * 방 삭제
     * 
     * TODO: [DB 연동] sessions 테이블 업데이트
     * - sessions.status = CLOSED
     * - sessions.finished_at = NOW()
     * 
     * 예시:
     * sessionRepository.updateStatusById(roomId, SessionStatus.CLOSED, LocalDateTime.now());
     */
    public void removeRoom(String roomId) {
        RoomState removed = rooms.remove(roomId);
        if (removed != null) {
            log.info("방 삭제: roomId={}", roomId);
            
            // TODO: [DB 연동] 위 주석 참고하여 구현
        }
    }
    
    /**
     * 모든 방 조회
     */
    public Collection<RoomState> getAllRooms() {
        return new ArrayList<>(rooms.values());
    }
    
    /**
     * 전체 방 개수
     */
    public int getRoomCount() {
        return rooms.size();
    }
    
    /**
     * 특정 방의 참가자 수 조회
     */
    public int getParticipantCount(String roomId) {
        return getRoom(roomId)
                .map(RoomState::getParticipantCount)
                .orElse(0);
    }
    
    /**
     * 방 존재 여부 확인
     */
    public boolean hasRoom(String roomId) {
        return rooms.containsKey(roomId);
    }
    
    /**
     * 모든 방 정리 (테스트용)
     */
    public void clear() {
        rooms.clear();
        log.info("모든 방 정리 완료");
    }
}
