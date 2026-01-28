package com.ssafya701.roundy.webrtc.rotation;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.outbound.PairAssignedMessage;
import com.ssafya701.roundy.webrtc.message.outbound.RoundEndMessage;
import com.ssafya701.roundy.webrtc.message.outbound.RoundStartMessage;
import com.ssafya701.roundy.webrtc.room.ParticipantState;
import com.ssafya701.roundy.webrtc.room.RoomState;
import com.ssafya701.roundy.webrtc.serializer.WsMessageSerializer;
import com.ssafya701.roundy.webrtc.logging.WebRtcEventLogger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.List;
import java.util.Map;

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
     * PAIR_ASSIGNED 개별 전송
     * 
     * @param room 방 상태
     * @param roundNumber 라운드 번호
     * @param pairMap 사용자별 파트너 매핑 (userId -> partnerId, partnerId가 null이면 혼자)
     */
    public void publishPairAssignments(RoomState room, int roundNumber, Map<Long, Long> pairMap) {
        List<ParticipantState> participants = room.getParticipantList();
        
        for (ParticipantState participant : participants) {
            Long userId = participant.getUserId();
            Long partnerId = pairMap.get(userId);
            
            // 파트너 닉네임 조회
            String partnerNickname = null;
            if (partnerId != null) {
                partnerNickname = room.getParticipant(partnerId)
                        .map(ParticipantState::getNickname)
                        .orElse(null);
            }
            
            PairAssignedMessage message = new PairAssignedMessage(
                room.getRoomId(),
                roundNumber,
                partnerId,
                partnerNickname
            );
            
            sendToParticipant(participant, message);
            
            if (partnerId != null) {
                log.debug("PAIR_ASSIGNED 발행: userId={}, partnerId={}, partnerNickname={}", 
                        userId, partnerId, partnerNickname);
            } else {
                log.debug("PAIR_ASSIGNED 발행: userId={} (혼자)", userId);
            }
        }
        
        log.info("PAIR_ASSIGNED 발행 완료: roomId={}, round={}, 참가자 {}명", 
                room.getRoomId(), roundNumber, participants.size());
        
        eventLogger.logPairsAssigned(room.getRoomId(), roundNumber, pairMap);
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
}
