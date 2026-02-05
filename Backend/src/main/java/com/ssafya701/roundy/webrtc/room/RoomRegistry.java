package com.ssafya701.roundy.webrtc.room;

import com.ssafya701.roundy.match.enums.SessionStatus;
import com.ssafya701.roundy.webrtc.room.enums.RotationMode;
import lombok.RequiredArgsConstructor;
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
@RequiredArgsConstructor
public class RoomRegistry {
    private final Map<String, RoomState> rooms = new ConcurrentHashMap<>();
    private final com.ssafya701.roundy.webrtc.rotation.RoomEventPublisher eventPublisher;
    private final com.ssafya701.roundy.match.repository.SessionRepository sessionRepository;
    
    /**
     * 입장 가능한 방을 찾거나, 없으면 새로운 방을 생성
     */
    public synchronized RoomState findAvailableOrCreateRoom(RotationMode mode, 
                                                          com.ssafya701.roundy.webrtc.room.enums.Gender gender, 
                                                          com.ssafya701.roundy.webrtc.openvidu.OpenViduService openViduService) throws Exception {
        // 1. 입장 가능한 기존 방 탐색
        Optional<RoomState> availableRoom = rooms.values().stream()
                .filter(room -> room.getMode() == mode)
                .filter(room -> room.getCurrentStage() == com.ssafya701.roundy.webrtc.room.enums.Stage.WAITING)
                .filter(room -> room.getParticipantCount() < 4) // 전체 인원 체크
                .filter(room -> {
                    // PAIR_ONLY 모드 성별 제한 체크 (최대 2명)
                    if (mode == RotationMode.PAIR_ONLY) {
                        return gender == com.ssafya701.roundy.webrtc.room.enums.Gender.MALE 
                            ? room.getMaleCount() < 2 
                            : room.getFemaleCount() < 2;
                    }
                    return true;
                })
                .findFirst();

        if (availableRoom.isPresent()) {
            return availableRoom.get();
        }

        // 2. 없으면 새 방 생성
        // UUID 기반의 랜덤 방 ID 생성
        String newRoomId = "room-" + java.util.UUID.randomUUID().toString().substring(0, 8);
        
        // OpenVidu 세션 생성 (필수: 서로 다른 세션이어야 미디어 격리됨)
        String openViduSessionId = openViduService.ensureSession(newRoomId);
        
        log.info("🎯 자동 매칭: 새 방 생성 roomId={}, sessionId={}", newRoomId, openViduSessionId);
        
        return getOrCreateRoom(newRoomId, mode, openViduSessionId);
    }

    /**
     * 방 생성 또는 조회
     */
    public RoomState getOrCreateRoom(String roomId, RotationMode mode, String openViduSessionId) {
        return rooms.computeIfAbsent(roomId, id -> {
            log.info("새로운 방 생성: roomId={}, mode={}, sessionId={}", roomId, mode, openViduSessionId);

            // [DB 연동] 새 Session 생성 및 저장
            com.ssafya701.roundy.match.entity.Session session = com.ssafya701.roundy.match.entity.Session.builder()
                    .roomId(roomId)
                    .status(SessionStatus.RECRUITING)
                    .maleMax(6) // 기본값
                    .femaleMax(6) // 기본값
                    .build();
            
            com.ssafya701.roundy.match.entity.Session savedSession = sessionRepository.save(session);
            log.info("Session DB 저장 완료: id={}, roomId={}", savedSession.getId(), savedSession.getRoomId());
            
            RoomState roomState = new RoomState(roomId, mode, openViduSessionId);
            roomState.setDbSessionId(savedSession.getId());
            
            return roomState;
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
     * @throws IllegalStateException 성별별 정원 초과 시
     */
    public void addParticipant(String roomId, Long userId, String nickname, com.ssafya701.roundy.webrtc.room.enums.Gender gender, WebSocketSession session) {
        RoomState room = rooms.get(roomId);
        if (room == null) {
            log.warn("존재하지 않는 방에 참가자 추가 시도: roomId={}", roomId);
            return;
        }
        
        // PAIR_ONLY 모드에서 성별별 정원 검증
        if (room.getMode() == RotationMode.PAIR_ONLY) {
            if (gender == com.ssafya701.roundy.webrtc.room.enums.Gender.MALE && room.getMaleCount() >= room.getMaleMax()) {
                throw new IllegalStateException("남성 정원 초과: 현재 " + room.getMaleCount() + "명 / 최대 " + room.getMaleMax() + "명");
            }
            if (gender == com.ssafya701.roundy.webrtc.room.enums.Gender.FEMALE && room.getFemaleCount() >= room.getFemaleMax()) {
                throw new IllegalStateException("여성 정원 초과: 현재 " + room.getFemaleCount() + "명 / 최대 " + room.getFemaleMax() + "명");
            }
        }
        
        room.addParticipant(userId, nickname, gender, session);
        log.info("참가자 추가: roomId={}, userId={}, nickname={}, gender={}, 현재 인원={} (남:{}명, 여:{}명)", 
                roomId, userId, nickname, gender, room.getParticipantCount(), 
                room.getMaleCount(), room.getFemaleCount());
    }
    
    /**
     * 참가자 제거
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
            
            // 로테이션 단계 중에 나간 경우 파트너에게 알림
            notifyPartnerIfInRotation(room, removed);
        }
        
        // 방이 비었으면 삭제
        if (room.isEmpty()) {
            removeRoom(roomId);
        }
    }
    
    /**
     * 로테이션 단계에서 참가자가 나갔을 때 파트너에게 알림
     */
    private void notifyPartnerIfInRotation(RoomState room, ParticipantState leftParticipant) {
        // 현재 로테이션 단계인지 확인
        if (!room.getCurrentStage().isRotationStage()) {
            return;
        }
        
        // 파트너 ID 조회
        Long partnerId = room.getPartnerId(leftParticipant.getUserId());
        if (partnerId == null) {
            return;
        }
        
        // 파트너 정보 조회
        ParticipantState partner = room.getParticipant(partnerId).orElse(null);
        if (partner == null) {
            return;
        }
        
        // 파트너에게 PARTNER_LEFT 메시지 전송
        eventPublisher.publishPartnerLeft(
            partner, 
            leftParticipant.getUserId(), 
            leftParticipant.getNickname()
        );
        
        log.warn("⚠️ 로테이션 중 참가자 이탈 알림 전송: roomId={}, leftUserId={}, partnerId={}, stage={}", 
                room.getRoomId(), leftParticipant.getUserId(), partnerId, room.getCurrentStage());
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
     * 방 삭제 및 DB 상태 업데이트
     */
    public void removeRoom(String roomId) {
        RoomState removed = rooms.remove(roomId);
        if (removed != null) {
            log.info("방 삭제: roomId={}", roomId);
            
            // DB session 상태 업데이트 (CLOSED)
            Long dbSessionId = removed.getDbSessionId();
            if (dbSessionId != null) {
                sessionRepository.findById(dbSessionId).ifPresent(session -> {
                    session.updateStatus(com.ssafya701.roundy.match.enums.SessionStatus.CLOSED);
                    sessionRepository.save(session);
                    log.info("Session DB 상태 업데이트(CLOSED): id={}", dbSessionId);
                });
            }
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
