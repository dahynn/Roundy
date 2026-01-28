package com.ssafya701.roundy.webrtc.handler;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.inbound.JoinRoomMessage;
import com.ssafya701.roundy.webrtc.message.inbound.LeaveRoomMessage;
import com.ssafya701.roundy.webrtc.message.outbound.ErrorMessage;
import com.ssafya701.roundy.webrtc.message.outbound.JoinOkMessage;
import com.ssafya701.roundy.webrtc.message.outbound.RoomStateMessage;
import com.ssafya701.roundy.webrtc.openvidu.OpenViduService;
import com.ssafya701.roundy.webrtc.room.ParticipantState;
import com.ssafya701.roundy.webrtc.room.RoomRegistry;
import com.ssafya701.roundy.webrtc.room.RoomState;
import com.ssafya701.roundy.webrtc.room.enums.RotationMode;
import com.ssafya701.roundy.webrtc.rotation.RotationScheduler;
import com.ssafya701.roundy.webrtc.serializer.WsMessageSerializer;
import com.ssafya701.roundy.webrtc.logging.WebRtcEventLogger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * WebRTC WebSocket 핸들러
 * 클라이언트와의 WebSocket 연결을 처리하고 메시지를 라우팅
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebRtcWebSocketHandler extends TextWebSocketHandler {

    private final WsMessageSerializer messageSerializer;
    private final RoomRegistry roomRegistry;
    private final OpenViduService openViduService;
    private final RotationScheduler rotationScheduler;
    private final WebRtcEventLogger eventLogger;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Long userId = (Long) session.getAttributes().get("userId");
        String username = (String) session.getAttributes().get("username");

        log.info("WebSocket 연결 성공: sessionId={}, userId={}, username={}", 
                session.getId(), userId, username);
        
        eventLogger.logConnectionEstablished(session.getId(), userId, username);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();

        try {
            WsMessage wsMessage = messageSerializer.deserialize(payload);
            
            switch (wsMessage.getType()) {
                case JOIN_ROOM -> handleJoinRoom(session, (JoinRoomMessage) wsMessage);
                case LEAVE_ROOM -> handleLeaveRoom(session, (LeaveRoomMessage) wsMessage);
                default -> {
                    sendError(session, "UNKNOWN_MESSAGE_TYPE", "알 수 없는 메시지 타입입니다");
                }
            }
        } catch (JsonProcessingException e) {
            sendError(session, "INVALID_MESSAGE", "잘못된 메시지 형식입니다");
        } catch (Exception e) {
            sendError(session, "INTERNAL_ERROR", "서버 오류가 발생했습니다");
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        Long userId = (Long) session.getAttributes().get("userId");

        eventLogger.logConnectionClosed(session.getId(), userId, status.toString());
        
        // 세션 ID로 참가자 제거
        roomRegistry.removeParticipantBySessionId(session.getId());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.error("WebSocket 전송 오류: sessionId={}", session.getId(), exception);
    }

    /**
     * JOIN_ROOM 메시지 처리
     */
    private void handleJoinRoom(WebSocketSession session, JoinRoomMessage message) throws IOException {
        Long userId = (Long) session.getAttributes().get("userId");
        String username = (String) session.getAttributes().get("username");
        String roomId = message.getRoomId();

        try {
            // TODO: [DB 연동] User 엔티티로 사용자 검증
            // User user = userService.findById(userId)
            //     .orElseThrow(() -> new UserNotFoundException(userId));
            // if (!user.isActive()) {
            //     throw new UserInactiveException(userId);
            // }
            
            // 1. OpenVidu Session 보장
            String openViduSessionId = openViduService.ensureSession(roomId);

            // 2. 방 생성 또는 조회 (기본값: FREE_TALK 모드)
            // TODO: [DB 연동] Room 엔티티에서 방 정보 조회
            // Room roomEntity = roomService.findById(roomId)
            //     .orElseThrow(() -> new RoomNotFoundException(roomId));
            // RotationMode mode = RotationMode.valueOf(roomEntity.getMode());
            // RoomState room = roomRegistry.getOrCreateRoom(roomId, mode, openViduSessionId);
            RoomState room = roomRegistry.getOrCreateRoom(roomId, RotationMode.FREE_TALK, openViduSessionId);

            // 3. 참가자 추가
            roomRegistry.addParticipant(roomId, userId, username, session);

            // 4. OpenVidu Token 발급
            String token = openViduService.generateToken(roomId, userId);
            room.setParticipantToken(userId, token);

            // 5. JOIN_OK 응답 전송
            JoinOkMessage.RoundInfoDto roundInfo = null;
            if (room.getCurrentRound() != null) {
                roundInfo = new JoinOkMessage.RoundInfoDto(
                        room.getCurrentRound().getCurrentRound(),
                        room.getCurrentRound().getTotalRounds(),
                        room.getCurrentRound().getDurationSeconds()
                );
            }

            JoinOkMessage joinOk = new JoinOkMessage(
                    roomId,
                    openViduService.getOpenViduUrl(),
                    token,
                    room.getMode().name(),
                    roundInfo
            );
            sendMessage(session, joinOk);

            // 6. ROOM_STATE 브로드캐스트
            broadcastRoomState(room);

            // 7. 로테이션 스케줄러 시작 (PAIR_ONLY 모드인 경우)
            if (room.isPairMode() && !room.isRoundActive()) {
                rotationScheduler.startRotation(room, null);
            }

            // TODO: [DB 연동] 방 참가 이벤트 기록
            // roomParticipantRepository.save(new RoomParticipant(
            //     roomId, userId, LocalDateTime.now(), null
            // ));
            
            // TODO: [운영 환경] 모니터링 메트릭 추가
            // meterRegistry.counter("webrtc.room.join", "roomId", roomId).increment();
            // meterRegistry.gauge("webrtc.room.participants", room.getParticipantCount());
            
            eventLogger.logRoomJoined(roomId, userId, username, room.getParticipantCount());

        } catch (OpenViduService.OpenViduServiceException e) {
            log.error("OpenVidu 연결 실패: roomId={}, userId={}", roomId, userId, e);
            sendError(session, "OPENVIDU_ERROR", "OpenVidu 연결에 실패했습니다");
        } catch (Exception e) {
            log.error("방 참가 실패: roomId={}, userId={}", roomId, userId, e);
            sendError(session, "JOIN_FAILED", "방 참가에 실패했습니다");
        }
    }

    /**
     * LEAVE_ROOM 메시지 처리
     */
    private void handleLeaveRoom(WebSocketSession session, LeaveRoomMessage message) throws IOException {
        Long userId = (Long) session.getAttributes().get("userId");
        String roomId = message.getRoomId();

        try {
            // TODO: [DB 연동] 방 퇴장 이벤트 기록
            // roomParticipantRepository.updateLeftAt(roomId, userId, LocalDateTime.now());
            
            // 1. 참가자 제거
            roomRegistry.removeParticipant(roomId, userId);

            // 2. 방 상태 확인
            roomRegistry.getRoom(roomId).ifPresentOrElse(
                    room -> {
                        try {
                            // 3. ROOM_STATE 브로드캐스트
                            broadcastRoomState(room);

                            // 4. 방이 비었으면 로테이션 중지
                            if (room.isEmpty()) {
                                rotationScheduler.stopRotation(roomId);
                            }
                        } catch (Exception e) {
                            log.error("방 상태 브로드캐스트 실패: roomId={}", roomId, e);
                        }
                    },
                    () -> {}
            );
            
            eventLogger.logRoomLeft(roomId, userId, roomRegistry.getParticipantCount(roomId));

        } catch (Exception e) {
            log.error("방 퇴장 실패: roomId={}, userId={}", roomId, userId, e);
            sendError(session, "LEAVE_FAILED", "방 퇴장에 실패했습니다");
        }
    }

    /**
     * 방의 모든 참가자에게 ROOM_STATE 브로드캐스트
     */
    public void broadcastRoomState(RoomState room) throws IOException {
        List<RoomStateMessage.ParticipantDto> participantDtos = room.getParticipantList().stream()
                .map(p -> new RoomStateMessage.ParticipantDto(p.getUserId(), p.getNickname()))
                .collect(Collectors.toList());

        RoomStateMessage roomState = new RoomStateMessage(
                room.getRoomId(),
                participantDtos,
                room.getParticipantCount()
        );

        broadcastMessage(room, roomState);
    }

    /**
     * 특정 세션에 메시지 전송
     */
    public void sendMessage(WebSocketSession session, WsMessage message) throws IOException {
        if (session.isOpen()) {
            String json = messageSerializer.serialize(message);
            session.sendMessage(new TextMessage(json));
        }
    }

    /**
     * 방의 모든 참가자에게 메시지 브로드캐스트
     */
    public void broadcastMessage(RoomState room, WsMessage message) throws IOException {
        String json = messageSerializer.serialize(message);
        TextMessage textMessage = new TextMessage(json);

        for (ParticipantState participant : room.getParticipantList()) {
            WebSocketSession session = participant.getSession();
            if (session.isOpen()) {
                session.sendMessage(textMessage);
            }
        }
    }

    /**
     * 에러 메시지 전송
     */
    private void sendError(WebSocketSession session, String code, String errorMessage) {
        try {
            ErrorMessage error = new ErrorMessage(code, errorMessage);
            sendMessage(session, error);
        } catch (Exception e) {
            log.error("에러 메시지 전송 실패: sessionId={}, code={}", session.getId(), code, e);
        }
    }
}
