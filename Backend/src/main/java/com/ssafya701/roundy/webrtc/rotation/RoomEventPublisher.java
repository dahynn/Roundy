package com.ssafya701.roundy.webrtc.rotation;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.outbound.*;
import com.ssafya701.roundy.webrtc.room.ParticipantState;
import com.ssafya701.roundy.webrtc.room.RoomState;
import com.ssafya701.roundy.webrtc.room.enums.Stage;
import com.ssafya701.roundy.webrtc.serializer.WsMessageSerializer;
import com.ssafya701.roundy.webrtc.logging.WebRtcEventLogger;
import com.ssafya701.roundy.webrtc.openvidu.OpenViduService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 방 이벤트 발행자
 * WebSocket을 통해 라운드 시작/종료, 페어 배정 메시지 전송
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RoomEventPublisher {
    
    private final WsMessageSerializer messageSerializer;
    private final WebRtcEventLogger eventLogger;
    private final OpenViduService openViduService;
    
    /**
     * ROUND_START 브로드캐스트
     * 
     * @param room 방 상태
     * @param roundNumber 라운드 번호
     * @param durationSeconds 라운드 지속 시간 (초)
     */
    public void publishRoundStart(RoomState room, int roundNumber, int durationSeconds) {
        RoundStartMessage message = new RoundStartMessage(
            room.getRoomId(),
            roundNumber,
            durationSeconds
        );
        
        broadcastToRoom(room, message);
        log.info("ROUND_START 발행: roomId={}, round={}, duration={}s", 
                room.getRoomId(), roundNumber, durationSeconds);
        
        eventLogger.logRoundStarted(room.getRoomId(), roundNumber, 
                room.getCurrentRound().getTotalRounds(), durationSeconds, room.getParticipantCount());
    }
    
    /**
     * ROUND_END 브로드캐스트
     * 
     * @param room 방 상태
     * @param roundNumber 라운드 번호
     */
    public void publishRoundEnd(RoomState room, int roundNumber) {
        RoundEndMessage message = new RoundEndMessage(
            room.getRoomId(),
            roundNumber
        );
        
        broadcastToRoom(room, message);
        log.info("ROUND_END 발행: roomId={}, round={}", room.getRoomId(), roundNumber);

        eventLogger.logRoundEnded(room.getRoomId(), roundNumber, 
                room.getCurrentRound().getTotalRounds());
    }
    
    /**
     * PAIR_ASSIGNED 개별 전송 (페어별 프라이빗 OpenVidu 세션 포함)
     * 
     * @param room 방 상태
     * @param roundNumber 라운드 번호
     * @param pairMap 사용자별 파트너 매핑 (userId -> partnerId)
     */
    public void publishPairAssignments(RoomState room, int roundNumber, Map<Long, Long> pairMap) {
        String baseRoomId = room.getRoomId();
        Set<String> createdSessions = new HashSet<>();  // 중복 생성 방지
        
        List<ParticipantState> participants = room.getParticipantList();
        
        for (ParticipantState participant : participants) {
            Long userId = participant.getUserId();
            Long partnerId = pairMap.get(userId);
            
            String privateSessionId = null;
            String privateToken = null;
            String partnerNickname = null;
            
            if (partnerId != null) {
                // 파트너 닉네임 조회
                partnerNickname = room.getParticipant(partnerId)
                        .map(ParticipantState::getNickname)
                        .orElse(null);
                
                // 프라이빗 세션 ID 생성 (일관성: 작은 ID를 먼저)
                privateSessionId = baseRoomId + "-pair-round" + roundNumber + "-" + 
                    Math.min(userId, partnerId) + "-" + Math.max(userId, partnerId);
                
                // 세션이 아직 생성되지 않았으면 생성
                if (!createdSessions.contains(privateSessionId)) {
                    try {
                        openViduService.ensureSession(privateSessionId);
                        createdSessions.add(privateSessionId);
                        log.info("💑 페어 프라이빗 세션 생성: {} (round {})", privateSessionId, roundNumber);
                    } catch (OpenViduService.OpenViduServiceException e) {
                        log.error("페어 프라이빗 세션 생성 실패: {}", privateSessionId, e);
                        privateSessionId = null; // 실패 시 null로 설정
                    }
                }
                
                // 토큰 발급
                if (privateSessionId != null) {
                    try {
                        privateToken = openViduService.generateToken(privateSessionId, userId);
                    } catch (Exception e) {
                        log.error("페어 프라이빗 토큰 발급 실패: userId={}, sessionId={}", userId, privateSessionId, e);
                        privateToken = null;
                    }
                }
            }
            
            // 메시지 생성 및 전송
            PairAssignedMessage message = new PairAssignedMessage(
                baseRoomId,
                roundNumber,
                partnerId,
                partnerNickname,
                privateSessionId,
                privateToken
            );
            
            sendToParticipant(participant, message);
            
            if (partnerId != null) {
                log.debug("PAIR_ASSIGNED 발행: userId={}, partnerId={}, sessionId={}", 
                        userId, partnerId, privateSessionId);
            } else {
                log.debug("PAIR_ASSIGNED 발행: userId={} (혼자)", userId);
            }
        }
        
        log.info("PAIR_ASSIGNED 발행 완료: roomId={}, round={}, 참가자 {}명, 프라이빗 세션 {}개", 
                baseRoomId, roundNumber, participants.size(), createdSessions.size());
        
        eventLogger.logPairsAssigned(baseRoomId, roundNumber, pairMap);
    }
    
    /**
     * 방 전체에 브로드캐스트
     */
    private void broadcastToRoom(RoomState room, Object message) {
        try {
            String json = messageSerializer.serialize((WsMessage) message);
            TextMessage textMessage = new TextMessage(json);
            
            List<ParticipantState> participants = room.getParticipantList();
            for (ParticipantState participant : participants) {
                sendMessage(participant.getSession(), textMessage);
            }
        } catch (Exception e) {
            log.error("브로드캐스트 실패: roomId={}, error={}", room.getRoomId(), e.getMessage(), e);
        }
    }
    
    /**
     * 특정 참가자에게 메시지 전송
     */
    private void sendToParticipant(ParticipantState participant, Object message) {
        try {
            String json = messageSerializer.serialize((WsMessage) message);
            TextMessage textMessage = new TextMessage(json);
            sendMessage(participant.getSession(), textMessage);
        } catch (Exception e) {
            log.error("메시지 전송 실패: userId={}, error={}", participant.getUserId(), e.getMessage(), e);
        }
    }
    
    /**
     * WebSocket 메시지 전송 (예외 처리 포함)
     */
    private void sendMessage(WebSocketSession session, TextMessage message) {
        try {
            if (session.isOpen()) {
                synchronized (session) {
                    session.sendMessage(message);
                }
            } else {
                log.warn("WebSocket 세션이 닫혀있음: sessionId={}", session.getId());
            }
        } catch (IOException e) {
            log.error("메시지 전송 실패: sessionId={}, error={}", 
                    session.getId(), e.getMessage(), e);
        }
    }
    
    // ========== 8단계 Stage 관련 메시지 발행 ==========
    
    /**
     * STAGE_CHANGE 브로드캐스트
     */
    public void publishStageChange(RoomState room, Stage stage) {
        StageChangeMessage message = new StageChangeMessage(
            room.getRoomId(),
            stage,
            stage.getDurationSeconds()
        );
        
        broadcastToRoom(room, message);
        log.info("STAGE_CHANGE 발행: roomId={}, stage={}, duration={}s", 
                room.getRoomId(), stage, stage.getDurationSeconds());
    }

    /**
     * BREAK 메시지 발행 (쉬는 시간)
     */
    public void publishBreak(RoomState room) {
        com.ssafya701.roundy.webrtc.message.outbound.BreakMessage message = 
            new com.ssafya701.roundy.webrtc.message.outbound.BreakMessage(
                room.getRoomId(),
                Stage.BREAK.getDurationSeconds()
            );
        
        broadcastToRoom(room, message);
        log.info("BREAK 발행: roomId={}, duration={}s", 
                room.getRoomId(), Stage.BREAK.getDurationSeconds());
    }
    
    /**
     * SPEAKER_CHANGE 브로드캐스트 (자기소개 발언자 변경)
     */
    public void publishSpeakerChange(RoomState room, Long speakerId, int remainingSeconds) {
        String nickname = room.getParticipant(speakerId)
                .map(ParticipantState::getNickname)
                .orElse("Unknown");
        
        SpeakerChangeMessage message = new SpeakerChangeMessage(
            speakerId,
            nickname,
            remainingSeconds
        );
        
        broadcastToRoom(room, message);
        log.info("SPEAKER_CHANGE 발행: userId={}, nickname={}", speakerId, nickname);
    }
    
    /**
     * MATCH_RESULT 개별 전송
     */
    public void publishMatchResult(ParticipantState participant, RoomState.MatchPair matchPair) {
        MatchResultMessage message = new MatchResultMessage(
            matchPair.isMatched(),
            matchPair.getPartnerId(participant.getUserId()),
            matchPair.getPartnerNickname(participant.getUserId())
        );
        
        sendToParticipant(participant, message);
        log.debug("MATCH_RESULT 발행: userId={}, matched={}", 
                participant.getUserId(), matchPair.isMatched());
    }
    
    /**
     * FACE_REVEAL_START 메시지 전송 (매칭된 커플에게만)
     * 각 커플을 위한 별도 OpenVidu 1대1 프라이빗 세션 생성
     */
    public void publishFaceRevealStart(RoomState room, java.util.List<RoomState.MatchPair> matches) {
        String baseRoomId = room.getRoomId();
        
        for (RoomState.MatchPair match : matches) {
            try {
                // 1대1 프라이빗 세션 ID 생성 (일관성 위해 작은 ID를 먼저)
                String privateSessionId = baseRoomId + "-private-" + 
                    Math.min(match.getUserId1(), match.getUserId2()) + "-" +
                    Math.max(match.getUserId1(), match.getUserId2());
                
                // OpenVidu 프라이빗 세션 생성
                openViduService.ensureSession(privateSessionId);
                
                // 각 사용자에게 토큰 발급 및 메시지 전송
                sendFaceRevealToUser(room, match.getUserId1(), match.getUserId2(), 
                    match.getNickname2(), privateSessionId);
                sendFaceRevealToUser(room, match.getUserId2(), match.getUserId1(), 
                    match.getNickname1(), privateSessionId);
                
                log.info("💕 프라이빗 세션 생성: {} → {} ({}) ↔ {} ({})", 
                    privateSessionId, 
                    match.getUserId1(), match.getNickname1(),
                    match.getUserId2(), match.getNickname2());
                    
            } catch (OpenViduService.OpenViduServiceException e) {
                log.error("프라이빗 세션 생성 실패: match={}", match, e);
            }
        }
        
        log.info("FACE_REVEAL_START 발행: roomId={}, 매칭 커플 {}쌍", baseRoomId, matches.size());
    }
    
    /**
     * 개별 사용자에게 FACE_REVEAL_START 메시지 전송
     */
    private void sendFaceRevealToUser(RoomState room, Long userId, Long partnerId, 
            String partnerNickname, String privateSessionId) {
        try {
            // OpenVidu 토큰 생성 (privateSessionId를 roomId로 사용)
            String token = openViduService.generateToken(privateSessionId, userId);
            
            // 메시지 생성
            FaceRevealStartMessage message = new FaceRevealStartMessage(
                room.getRoomId(),
                privateSessionId,
                token,
                partnerId,
                partnerNickname,
                "매칭되었습니다! 프라이빗 룸으로 이동하여 얼굴을 공개하세요."
            );
            
            // 개별 전송
            ParticipantState participant = room.getParticipant(userId)
                .orElseThrow(() -> new IllegalStateException("참가자 없음: " + userId));
            sendToParticipant(participant, message);
            
        } catch (Exception e) {
            log.error("FACE_REVEAL_START 전송 실패: userId={}", userId, e);
        }
    }
    
    /**
     * GAME_QUESTION 브로드캐스트 (게임 문제 출제)
     */
    public void publishGameQuestion(RoomState room, com.ssafya701.roundy.webrtc.game.GameQuestion question) {
        // 투표 가능한 후보자 리스트 생성 (모든 참가자)
        List<GameQuestionMessage.CandidateDto> candidates = room.getParticipantList().stream()
            .map(p -> new GameQuestionMessage.CandidateDto(p.getUserId(), p.getNickname()))
            .toList();
        
        GameQuestionMessage message = new GameQuestionMessage(
            question.getQuestionNumber(),
            3,  // 총 문제 수 (3턴으로 변경됨)
            question.getQuestion(),
            5, // 투표 시간 (초) - 5초로 단축됨
            candidates
        );
        
        broadcastToRoom(room, message);
        log.info("GAME_QUESTION 발행: roomId={}, question={}/{}", 
                room.getRoomId(), question.getQuestionNumber(), 5);
    }
    
    /**
     * GAME_RESULT 브로드캐스트 (게임 결과 발표)
     */
    public void publishGameResult(RoomState room, com.ssafya701.roundy.webrtc.game.GameQuestion question, 
            List<Long> winnerIds, Map<Long, Integer> voteCounts) {
        // 우승자 정보 (다수일 수 있음)
        List<GameResultMessage.WinnerDto> winners = new java.util.ArrayList<>();
        if (winnerIds != null && !winnerIds.isEmpty()) {
            for (Long winnerId : winnerIds) {
                String winnerNickname = room.getParticipant(winnerId)
                    .map(ParticipantState::getNickname)
                    .orElse("Unknown");
                int winnerVoteCount = voteCounts.getOrDefault(winnerId, 0);
                winners.add(new GameResultMessage.WinnerDto(winnerId, winnerNickname, winnerVoteCount));
            }
        }
        
        // 전체 투표 결과
        List<GameResultMessage.VoteResultDto> voteResults = room.getParticipantList().stream()
            .map(p -> new GameResultMessage.VoteResultDto(
                p.getUserId(),
                p.getNickname(),
                voteCounts.getOrDefault(p.getUserId(), 0)
            ))
            .sorted((a, b) -> b.getVoteCount() - a.getVoteCount())
            .toList();
        
        GameResultMessage message = new GameResultMessage(
            question.getQuestionNumber(),
            question.getQuestion(),
            winners,
            question.getBadgeName(),
            voteResults
        );
        
        broadcastToRoom(room, message);
        log.info("GAME_RESULT 발행: roomId={}, question={}, winners={}", 
                room.getRoomId(), question.getQuestionNumber(), winnerIds);
    }
    
    /**
     * PARTNER_LEFT 전송 (1:1 대화 중 파트너 이탈)
     */
    public void publishPartnerLeft(ParticipantState participant, Long partnerId, String partnerNickname) {
        PartnerLeftMessage message = new PartnerLeftMessage(
            partnerId,
            partnerNickname,
            "대화 상대가 나갔습니다."
        );
        
        sendToParticipant(participant, message);
        log.info("PARTNER_LEFT 발행: userId={}, partnerId={}", 
                participant.getUserId(), partnerId);
    }
    
    /**
     * PARTNER_RE CONNECTED 전송 (1:1 대화 중 파트너 재연결)
     */
    public void publishPartnerReconnected(ParticipantState participant, Long partnerId, String partnerNickname) {
        PartnerReconnectedMessage message = new PartnerReconnectedMessage(
            partnerId,
            partnerNickname,
            "대화 상대가 다시 연결되었습니다."
        );
        
        sendToParticipant(participant, message);
        log.info("PARTNER_RECONNECTED 발행: userId={}, partnerId={}", 
                participant.getUserId(), partnerId);
    }
    
    /**
     * 특정 사용자에게만 STAGE_CHANGE 메시지 전송
     */
    public void publishStageChangeToUser(RoomState room, Long userId, Stage stage, int durationSeconds) {
        StageChangeMessage message = new StageChangeMessage(
                room.getRoomId(),
                stage,
                durationSeconds);
        
        ParticipantState participant = room.getParticipant(userId).orElse(null);
        if (participant != null) {
            sendToParticipant(participant, message);
            log.debug("STAGE_CHANGE 개별 전송: userId={}, stage={}", userId, stage);
        }
    }
    
    /**
     * 특정 사용자에게만 메시지 전송 (외부 노출용)
     */
    public void sendToUser(RoomState room, Long userId, WsMessage message) throws IOException {
        ParticipantState participant = room.getParticipant(userId).orElse(null);
        if (participant != null) {
            sendToParticipant(participant, message);
        }
    }
    
    /**
     * ROOM_STATE 브로드캐스트
     */
    public void broadcastRoomState(RoomState room) throws IOException {
        List<RoomStateMessage.ParticipantDto> participantDtos = room.getParticipantList().stream()
                .map(p -> new RoomStateMessage.ParticipantDto(p.getUserId(), p.getNickname(), p.getGender().name()))
                .collect(java.util.stream.Collectors.toList());
        RoomStateMessage roomState = new RoomStateMessage(
                room.getRoomId(),
                participantDtos,
                room.getParticipantCount()
        );
        broadcastToRoom(room, roomState);
    }
    
    /**
     * 첫인상 투표 결과 브로드캐스트
     */
    public void publishFirstVoteResults(RoomState room) {
        java.util.List<FirstVoteResultMessage.VoteDetail> details = new java.util.ArrayList<>();
        Map<Long, Long> votes = room.getFirstVotes();
        
        for (Map.Entry<Long, Long> entry : votes.entrySet()) {
            Long voterId = entry.getKey();
            Long targetId = entry.getValue();
            // -1L인 경우 (기권/미선택) 처리
            Long realTargetId = (targetId != null && targetId == -1L) ? null : targetId;
            
            String voterName = room.getParticipant(voterId).map(ParticipantState::getNickname).orElse("Unknown");
            String targetName = "Unknown";
            
            if (realTargetId != null) {
                targetName = room.getParticipant(realTargetId).map(ParticipantState::getNickname).orElse("Unknown");
            } else {
                targetName = "None"; // 또는 null
            }
            
            details.add(new FirstVoteResultMessage.VoteDetail(voterId, voterName, realTargetId, targetName));
        }
        
        FirstVoteResultMessage message = new FirstVoteResultMessage(details);
        broadcastToRoom(room, message);
        
        log.info("FIRST_VOTE_RESULT 발행: roomId={}, 결과 {}건", room.getRoomId(), details.size());
    }
}
