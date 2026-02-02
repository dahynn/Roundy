package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 서버 → 클라이언트: 라운드 시작 (브로드캐스트)
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class RoundStartMessage implements WsMessage {
    private String roomId;
    private int roundNumber;
    private int durationSeconds;
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.ROUND_START;
    }
}
