package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 강제 퇴장 메시지 (서버 → 클라이언트)
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class KickMessage implements WsMessage {
    
    /**
     * 퇴장 사유
     */
    private String reason;
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.KICK;
    }
}
