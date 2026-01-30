package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 서버 → 클라이언트: 방 참가 성공
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class JoinOkMessage implements WsMessage {
    private String roomId;
    private String openviduUrl;
    private String token;
    private String mode;  // RotationMode enum 값
    private RoundInfoDto roundInfo;
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.JOIN_OK;
    }
    
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoundInfoDto {
        private int currentRound;
        private int totalRounds;
        private int durationSeconds;
    }
}
