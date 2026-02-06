package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 쉬는 시간 메시지 (서버 → 클라이언트)
 * 스테이지 사이 5초 휴식 알림
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class BreakMessage implements WsMessage {
    
    /**
     * 방 ID
     */
    private String roomId;
    
    /**
     * 휴식 시간 (초)
     */
    private int durationSeconds;
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.BREAK;
    }
}
