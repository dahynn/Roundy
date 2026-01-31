package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import com.ssafya701.roundy.webrtc.room.enums.Stage;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 스테이지 전환 메시지 (서버 → 클라이언트)
 * 새로운 단계 시작 시 모든 참가자에게 브로드캐스트
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class StageChangeMessage implements WsMessage {
    
    /**
     * 방 ID
     */
    private String roomId;
    
    /**
     * 새로운 스테이지
     */
    private Stage stage;
    
    /**
     * 스테이지 진행 시간 (초)
     */
    private int durationSeconds;
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.STAGE_CHANGE;
    }
}
