package com.ssafya701.roundy.webrtc.service;

import com.ssafya701.roundy.webrtc.openvidu.OpenViduService;
import com.ssafya701.roundy.webrtc.room.RoomRegistry;
import com.ssafya701.roundy.webrtc.room.RoomState;
import com.ssafya701.roundy.webrtc.room.enums.RotationMode;
import com.ssafya701.roundy.webrtc.rotation.RotationScheduler;
import com.ssafya701.roundy.match.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Optional;

/**
 * WebRTC 방 관리 서비스
 * 방 생성, 조회, 관리 등의 비즈니스 로직을 담당
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WebRtcRoomService {

    private final RoomRegistry roomRegistry;
    private final OpenViduService openViduService;
    private final RotationScheduler rotationScheduler;
    private final SessionRepository sessionRepository;

    /**
     * 방 생성 또는 조회
     * 
     * @param roomId 방 ID
     * @param mode 로테이션 모드
     * @return 방 상태
     */
    public RoomState getOrCreateRoom(String roomId, RotationMode mode) {
        log.debug("방 생성 또는 조회: roomId={}, mode={}", roomId, mode);
        
        // OpenVidu Session 보장
        String openViduSessionId = openViduService.ensureSession(roomId);
        
        // 방 생성 또는 조회
        RoomState room = roomRegistry.getOrCreateRoom(roomId, mode, openViduSessionId);
        
        log.info("방 생성/조회 완료: roomId={}, mode={}, 참가자 수={}", 
                roomId, room.getMode(), room.getParticipantCount());
        
        return room;
    }

    /**
     * 방 조회
     * 
     * @param roomId 방 ID
     * @return 방 상태 (Optional)
     */
    public Optional<RoomState> getRoom(String roomId) {
        return roomRegistry.getRoom(roomId);
    }

    /**
     * 모든 방 조회
     * 
     * @return 모든 방 목록
     */
    public Collection<RoomState> getAllRooms() {
        return roomRegistry.getAllRooms();
    }

    /**
     * 방 삭제
     * 
     * @param roomId 방 ID
     */
    public void removeRoom(String roomId) {
        log.info("방 삭제 요청: roomId={}", roomId);
        
        // 로테이션 중지
        rotationScheduler.stopRotation(roomId);
        
        // OpenVidu Session 제거
        openViduService.removeSession(roomId);
        
        // 방 제거
        roomRegistry.removeRoom(roomId);
        
        log.info("방 삭제 완료: roomId={}", roomId);
    }

    /**
     * 방 존재 여부 확인
     * 
     * @param roomId 방 ID
     * @return 존재 여부
     */
    public boolean hasRoom(String roomId) {
        return roomRegistry.hasRoom(roomId);
    }

    /**
     * 방의 참가자 수 조회
     * 
     * @param roomId 방 ID
     * @return 참가자 수
     */
    public int getParticipantCount(String roomId) {
        return roomRegistry.getParticipantCount(roomId);
    }

    /**
     * 방의 로테이션 시작
     * 
     * @param roomId 방 ID
     * @param totalRounds 총 라운드 수 (null이면 자동 계산)
     */
    public void startRotation(String roomId, Integer totalRounds) {
        Optional<RoomState> roomOpt = roomRegistry.getRoom(roomId);
        if (roomOpt.isEmpty()) {
            log.warn("방을 찾을 수 없음: roomId={}", roomId);
            return;
        }
        
        RoomState room = roomOpt.get();
        
        // FREE_TALK 모드는 로테이션 불가
        if (!room.isPairMode()) {
            log.warn("FREE_TALK 모드는 로테이션을 시작할 수 없습니다: roomId={}", roomId);
            return;
        }
        
        log.info("로테이션 시작 요청: roomId={}, totalRounds={}, 참가자 수={}", 
                roomId, totalRounds, room.getParticipantCount());
        
        // [DB 연동] Session 상태 업데이트 (WAITING -> RUNNING)
        if (room.getDbSessionId() != null) {
            sessionRepository.findById(room.getDbSessionId()).ifPresent(session -> {
                session.updateStatus(com.ssafya701.roundy.match.enums.SessionStatus.ONGOING);
                sessionRepository.save(session);
                log.info("Session DB 상태 업데이트(ONGOING): id={}", session.getId());
            });
        }
        
        rotationScheduler.startRotation(room, totalRounds);
    }

    /**
     * 방의 로테이션 중지
     * 
     * @param roomId 방 ID
     */
    public void stopRotation(String roomId) {
        log.info("로테이션 중지 요청: roomId={}", roomId);
        rotationScheduler.stopRotation(roomId);
    }

    /**
     * 방의 로테이션 활성 여부 확인
     * 
     * @param roomId 방 ID
     * @return 로테이션 활성 여부
     */
    public boolean isRotationActive(String roomId) {
        return rotationScheduler.isRotationActive(roomId);
    }

    /**
     * 전체 방 개수 조회
     * 
     * @return 방 개수
     */
    public int getRoomCount() {
        return roomRegistry.getRoomCount();
    }

    /**
     * 방 통계 정보 조회
     * 
     * @return 방 통계 정보
     */
    public RoomStatistics getStatistics() {
        Collection<RoomState> rooms = roomRegistry.getAllRooms();
        
        int totalRooms = rooms.size();
        int totalParticipants = rooms.stream()
                .mapToInt(RoomState::getParticipantCount)
                .sum();
        int activeRotations = (int) rooms.stream()
                .filter(room -> rotationScheduler.isRotationActive(room.getRoomId()))
                .count();
        int pairModeRooms = (int) rooms.stream()
                .filter(RoomState::isPairMode)
                .count();
        int freeTalkRooms = totalRooms - pairModeRooms;
        
        return new RoomStatistics(
                totalRooms,
                totalParticipants,
                activeRotations,
                pairModeRooms,
                freeTalkRooms
        );
    }

    /**
     * 방 통계 정보
     */
    public record RoomStatistics(
            int totalRooms,
            int totalParticipants,
            int activeRotations,
            int pairModeRooms,
            int freeTalkRooms
    ) {
    }
}
