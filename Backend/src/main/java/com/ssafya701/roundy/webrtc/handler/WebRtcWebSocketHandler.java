package com.ssafya701.roundy.webrtc.handler;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.inbound.JoinRoomMessage;
import com.ssafya701.roundy.webrtc.message.inbound.LeaveRoomMessage;
import com.ssafya701.roundy.webrtc.message.inbound.SubmitVoteMessage;
import com.ssafya701.roundy.webrtc.message.inbound.SubmitGameVoteMessage;
import com.ssafya701.roundy.webrtc.message.outbound.ErrorMessage;
import com.ssafya701.roundy.webrtc.message.outbound.JoinOkMessage;
import com.ssafya701.roundy.webrtc.message.outbound.RoomStateMessage;
import com.ssafya701.roundy.webrtc.message.outbound.VoteSubmittedMessage;
import com.ssafya701.roundy.webrtc.openvidu.OpenViduService;
import com.ssafya701.roundy.webrtc.room.ParticipantState;
import com.ssafya701.roundy.webrtc.room.RoomRegistry;
import com.ssafya701.roundy.webrtc.room.RoomState;
import com.ssafya701.roundy.webrtc.room.enums.RotationMode;
import com.ssafya701.roundy.webrtc.room.enums.Gender;
import com.ssafya701.roundy.webrtc.room.enums.Stage;
import com.ssafya701.roundy.webrtc.rotation.RoomEventPublisher;
import com.ssafya701.roundy.webrtc.rotation.RotationScheduler;
import com.ssafya701.roundy.webrtc.rotation.StageScheduler;
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
import java.util.Optional;
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
    private final StageScheduler stageScheduler;
    private final WebRtcEventLogger eventLogger;
    private final DisconnectScheduler disconnectScheduler;
    private final RoomEventPublisher eventPublisher;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Long userId = (Long) session.getAttributes().get("userId");
        String username = (String) session.getAttributes().get("username");
        String gender = (String) session.getAttributes().get("gender");
        String mode = (String) session.getAttributes().get("mode");

        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        log.info("🔌 [WebSocket 연결 성공]");
        log.info("   📍 URL: {}", session.getUri());
        log.info("   👤 User ID: {}", userId);
        log.info("   🏷️  Username: {}", username);
        log.info("   ⚧️  Gender: {}", gender);
        log.info("   🎮 Mode: {}", mode);
        log.info("   🔑 Session ID: {}", session.getId());
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        eventLogger.logConnectionEstablished(session.getId(), userId, username);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        Long userId = (Long) session.getAttributes().get("userId");
        String username = (String) session.getAttributes().get("username");

        try {
            WsMessage wsMessage = messageSerializer.deserialize(payload);
            
            // 📨 WebSocket 메시지 로그
            log.info("📨 [WebSocket] Event: {}, Client: {} (userId: {}, sessionId: {})", 
                    wsMessage.getType(), 
                    username, 
                    userId, 
                    session.getId());
            
            switch (wsMessage.getType()) {
                case JOIN_ROOM -> handleJoinRoom(session, (JoinRoomMessage) wsMessage);
                case LEAVE_ROOM -> handleLeaveRoom(session, (LeaveRoomMessage) wsMessage);
                case SUBMIT_VOTE -> handleSubmitVote(session, (SubmitVoteMessage) wsMessage);
                case SUBMIT_GAME_VOTE -> handleSubmitGameVote(session, (SubmitGameVoteMessage) wsMessage);
                default -> {
                    log.warn("⚠️ [WebSocket] Unknown Event: {}, Client: {} (userId: {})", 
                            wsMessage.getType(), username, userId);
                    sendError(session, "UNKNOWN_MESSAGE_TYPE", "알 수 없는 메시지 타입입니다");
                }
            }
        } catch (JsonProcessingException e) {
            log.error("❌ [WebSocket] Invalid Message Format, Client: {} (userId: {}, sessionId: {})", 
                    username, userId, session.getId(), e);
            sendError(session, "INVALID_MESSAGE", "잘못된 메시지 형식입니다");
        } catch (Exception e) {
            log.error("❌ [WebSocket] Internal Error, Client: {} (userId: {}, sessionId: {})", 
                    username, userId, session.getId(), e);
            sendError(session, "INTERNAL_ERROR", "서버 오류가 발생했습니다");
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        Long userId = (Long) session.getAttributes().get("userId");
        String roomId = (String) session.getAttributes().get("roomId");

        eventLogger.logConnectionClosed(session.getId(), userId, status.toString());
        
        // 방 조회 및 ROTATION 단계 확인
        if (roomId != null) {
            roomRegistry.getRoom(roomId).ifPresent(room -> {
                // ROTATION 단계에서는 유예 기간 적용
                if (room.getCurrentStage() != null && room.getCurrentStage().isRotationStage()) {
                    log.info("🔌 연결 해제 감지 (ROTATION 단계): userId={}, roomId={}", userId, roomId);
                    
                    // 연결 해제 표시 (유예 기간 시작)
                    room.markDisconnected(userId);
                    
                    // 30초 후 영구 제거 체크 예약
                    disconnectScheduler.scheduleCheck(roomId, userId, 30000, () -> {
                        handlePermanentDisconnect(room, userId, roomId);
                    });
                } else {
                    // ROTATION 단계가 아니면 즉시 제거
                    log.info("🔌 연결 해제 (즉시 제거): userId={}, roomId={}", userId, roomId);
                    roomRegistry.removeParticipantBySessionId(session.getId());
                }
            });
        } else {
            // roomId가 없으면 즉시 제거
            roomRegistry.removeParticipantBySessionId(session.getId());
        }
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
        String genderStr = (String) session.getAttributes().get("gender");
        String modeStr = (String) session.getAttributes().get("mode");
        String roomId = message.getRoomId();
        
        // Session attributes에 roomId 저장 (disconnect detection을 위해)
        session.getAttributes().put("roomId", roomId);

        try {
            // Gender enum 변환
            Gender gender;
            try {
                gender = Gender.valueOf(genderStr.toUpperCase());
            } catch (Exception e) {
                log.warn("잘못된 gender 파라미터: {}, 기본값 MALE 사용", genderStr);
                gender = Gender.MALE;
            }
            
            // RotationMode enum 변환
            RotationMode mode;
            try {
                mode = RotationMode.valueOf(modeStr.toUpperCase());
            } catch (Exception e) {
                log.warn("잘못된 mode 파라미터: {}, 기본값 FREE_TALK 사용", modeStr);
                mode = RotationMode.FREE_TALK;
            }
            
            // TODO: [DB 연동] User 엔티티로 사용자 검증
            // User user = userService.findById(userId)
            //     .orElseThrow(() -> new UserNotFoundException(userId));
            // if (!user.isActive()) {
            //     throw new UserInactiveException(userId);
            // }
            // gender = user.getGender(); // DB에서 gender 가져오기
            
            // 1. 방 자동 배정 (재시도 로직 포함)
            // 매칭 로직: 모드, 성별, 대기 상태, 인원 수 고려
            RoomState room = null;
            int maxRetries = 3;
            
            for (int i = 0; i < maxRetries; i++) {
                try {
                    room = roomRegistry.findAvailableOrCreateRoom(mode, gender, openViduService);
                    roomId = room.getRoomId();
                    
                    // 3. 참가자 추가 시도 (여기서 정원 초과 예외 발생 가능)
                    roomRegistry.addParticipant(roomId, userId, username, gender, session);
                    
                    // 성공하면 루프 탈출
                    break;
                } catch (IllegalStateException e) {
                    // 정원 초과 등 경쟁 상태 발생 시 재시도
                    log.warn("방 참가 실패 (재시도 {}/{}): roomId={}, error={}", i+1, maxRetries, roomId, e.getMessage());
                    if (i == maxRetries - 1) {
                        throw e; // 마지막 시도도 실패하면 예외 던짐
                    }
                    // 잠시 대기 후 재시도 가능
                }
            }
            
            // Session attributes에 roomId 저장 (disconnect detection을 위해)
            session.getAttributes().put("roomId", roomId);
            
            log.info(">>> 사용자 방 배정 완료: userId={}, roomId={}, mode={}", userId, roomId, mode);
            
            // 2. (생략) OpenVidu Session은 findAvailableOrCreateRoom 내부에서 이미 보장됨
            // String openViduSessionId = openViduService.ensureSession(roomId);

            // 3. (생략) RoomState 조회도 이미 완료됨
            // RoomState room = roomRegistry.getOrCreateRoom(roomId, mode, openViduSessionId);
            
            // 4. 참가자 추가 (Gender 포함)
            roomRegistry.addParticipant(roomId, userId, username, gender, session);

            // 4. OpenVidu Token 발급
            String token = openViduService.generateToken(roomId, userId);
            room.setParticipantToken(userId, token);

            // 5. 방 자동 시작 조건 확인
            if (shouldStartRoom(room)) {
                log.info("🚀 방 인원 충족 - 로테이션 자동 시작: roomId={}", roomId);
                stageScheduler.startStageRotation(room);
            }

            // JOIN_OK 응답 전송
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


            // 7. 8단계 로테이션 자동 시작 (PAIR_ONLY 모드 + 남녀 동수 조건)
            if (room.isPairMode() && room.getCurrentStage() == Stage.WAITING) {
                int maleCount = room.getMaleCount();
                int femaleCount = room.getFemaleCount();
                int minPerGender = 2; // 최소 남자 2명, 여자 2명
                
                // 남녀 동수 체크 (비대칭 허용 안 함)
                if (maleCount >= minPerGender && femaleCount >= minPerGender && maleCount == femaleCount) {
                    log.info("🎬 8단계 로테이션 자동 시작: roomId={}, 남자={}명, 여자={}명", 
                            roomId, maleCount, femaleCount);
                    
                    // 자동 전환 스케줄러 시작
                    stageScheduler.startStageRotation(room);
                } else if (maleCount >= minPerGender && femaleCount >= minPerGender) {
                    // 최소 인원은 충족했지만 남녀 동수가 아닌 경우
                    log.info("⏳ 남녀 동수 대기 중: roomId={}, 남자={}명, 여자={}명 (남녀 동수 필요)", 
                            roomId, maleCount, femaleCount);
                } else {
                    // 최소 인원 미달
                    log.debug("대기 중: roomId={}, 남자={}명, 여자={}명 (최소 남녀 각 {}명 필요)", 
                            roomId, maleCount, femaleCount, minPerGender);
                }
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
            Long userId = (Long) session.getAttributes().get("userId");
            String username = (String) session.getAttributes().get("username");
            
            log.info("📤 [WebSocket] Send: {}, To: {} (userId: {}, sessionId: {})", 
                    message.getType(), username, userId, session.getId());
            
            String json = messageSerializer.serialize(message);
            session.sendMessage(new TextMessage(json));
        }
    }

    /**
     * 방의 모든 참가자에게 메시지 브로드캐스트
     */
    public void broadcastMessage(RoomState room, WsMessage message) throws IOException {
        log.info("📢 [WebSocket] Broadcast: {}, Room: {}, Participants: {}", 
                message.getType(), room.getRoomId(), room.getParticipantCount());
        
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
    
    /**
     * 특정 사용자에게만 메시지 전송
     */
    public void sendToUser(RoomState room, Long userId, WsMessage message) throws IOException {
        Optional<ParticipantState> participant = room.getParticipant(userId);
        if (participant.isPresent()) {
            WebSocketSession session = participant.get().getSession();
            if (session != null && session.isOpen()) {
                sendMessage(session, message);
            }
        }
    }
    
    /**
     * 방 자동 시작 조건 검사
     */
    private boolean shouldStartRoom(RoomState room) {
        if (room.getCurrentStage() != Stage.WAITING) {
            return false;
        }
        
        if (room.getMode() == RotationMode.PAIR_ONLY) {
            // 남녀 동수 체크 (2:2)
            // 주의: getMaleCount() 등은 addParticipant 이전에 호출되면 안 됨 (지금은 이후에 호출됨)
            return room.getMaleCount() >= 2 && room.getFemaleCount() >= 2;
        } else {
            // FREE_TALK: 4명 되면 시작
            return room.getParticipantCount() >= 4;
        }
    }

    // ========== 8단계 로테이션 메시지 처리 ==========
    
    /**
     * SUBMIT_VOTE 메시지 처리 (첫인상/최종 투표)
     */
    private void handleSubmitVote(WebSocketSession session, SubmitVoteMessage message) {
        Long userId = (Long) session.getAttributes().get("userId");
        Long targetUserId = message.getTargetUserId();
        
        // 세션 ID로 방 찾기
        RoomState room = roomRegistry.findRoomBySessionId(session.getId())
                .orElse(null);
        
        if (room == null) {
            sendError(session, "ROOM_NOT_FOUND", "방을 찾을 수 없습니다");
            return;
        }
        
        // 투표 대상이 방에 존재하는지 확인
        if (!room.getParticipant(targetUserId).isPresent()) {
            sendError(session, "INVALID_TARGET", "투표 대상이 방에 존재하지 않습니다");
            return;
        }
        
        // 자기 자신에게 투표하는지 확인
        if (userId.equals(targetUserId)) {
            sendError(session, "SELF_VOTE", "자신에게는 투표할 수 없습니다");
            return;
        }
        
        // 현재 스테이지가 투표 단계인지 확인
        if (!room.getCurrentStage().isVoteStage()) {
            sendError(session, "INVALID_STAGE", "현재 투표할 수 있는 단계가 아닙니다");
            return;
        }
        
        // 투표 제출 (첫인상 vs 최종 투표 구분)
        boolean isFinalVote = room.getCurrentStage().name().equals("VOTE_FINAL");
        room.submitVote(userId, targetUserId, isFinalVote);
        
        log.info("투표 제출: userId={}, targetId={}, type={}", 
                userId, targetUserId, isFinalVote ? "최종" : "첫인상");
        
        eventLogger.logVoteSubmitted(userId, targetUserId, isFinalVote);
        
        // 투표 완료 확인 메시지 전송 (클라이언트 피드백)
        int votedCount = isFinalVote ? room.getFinalVotesCount() : room.getFirstVotesCount();
        int totalCount = room.getParticipantCount();
        
        VoteSubmittedMessage confirmMessage = new VoteSubmittedMessage(
                isFinalVote ? "FINAL" : "FIRST",
                true,
                "투표가 성공적으로 제출되었습니다",
                votedCount,
                totalCount
        );
        
        try {
            sendMessage(session, confirmMessage);
        } catch (IOException e) {
            log.error("투표 확인 메시지 전송 실패: userId={}", userId, e);
        }
    }
    
    /**
     * SUBMIT_GAME_VOTE 메시지 처리 (이미지 게임 투표)
     */
    private void handleSubmitGameVote(WebSocketSession session, SubmitGameVoteMessage message) {
        Long voterId = (Long) session.getAttributes().get("userId");
        int questionNumber = message.getQuestionNumber();
        Long targetUserId = message.getTargetUserId();
        
        // 세션 ID로 방 찾기
        RoomState room = roomRegistry.findRoomBySessionId(session.getId())
                .orElse(null);
        
        if (room == null) {
            sendError(session, "ROOM_NOT_FOUND", "방을 찾을 수 없습니다");
            return;
        }
        
        // 현재 스테이지가 게임 단계인지 확인
        if (!room.getCurrentStage().isGameStage()) {
            sendError(session, "INVALID_STAGE", "현재 게임을 할 수 있는 단계가 아닙니다");
            return;
        }
        
        // 투표 저장
        room.submitGameVote(questionNumber, voterId, targetUserId);
        
        log.info("게임 투표 제출: voterId={}, targetUserId={}, question={}", 
                voterId, targetUserId, questionNumber);
        
        // 이벤트 로깅
        String targetNickname = room.getParticipant(targetUserId)
            .map(ParticipantState::getNickname)
            .orElse("Unknown");
        eventLogger.logGameAnswerSubmitted(voterId, targetNickname, "Q" + questionNumber);
    }
    
    // ==================================================================
    // 재연결 관련 헬퍼 메서드
    // ==================================================================
    
    /**
     * 영구 연결 해제 처리 (유예 기간 만료)
     */
    private void handlePermanentDisconnect(RoomState room, Long userId, String roomId) {
        log.info("⚠️ 유예 기간 만료 - 영구 연결 해제 처리: userId={}, roomId={}", userId, roomId);
        
        // 여전히 유예 기간 내에 있는지 재확인 (이중 체크)
        if (!room.isInGracePeriod(userId, 30000)) {
            // 방에서 참가자 제거
            ParticipantState removed = room.removeParticipant(userId);
            
            if (removed != null) {
                // 파트너에게 PARTNER_LEFT 알림
                Long partnerId = room.getPartner(userId);
                if (partnerId != null) {
                    room.getParticipant(partnerId).ifPresent(partner -> {
                        if (partner.isSessionOpen()) {
                            eventPublisher.publishPartnerLeft(partner, userId, removed.getNickname());
                        }
                    });
                }
                
                // 연결 해제 표시 제거
                room.clearDisconnected(userId);
                
                log.info("✅ 참가자 제거 완료: userId={}, roomId={}", userId, roomId);
            }
        } else {
            log.info("🔄 재연결 완료로 인해 영구 제거 취소: userId={}, roomId={}", userId, roomId);
        }
    }
}
