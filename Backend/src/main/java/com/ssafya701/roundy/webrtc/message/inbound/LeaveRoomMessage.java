package com.ssafya701.roundy.webrtc.message.inbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 클라이언트 → 서버: 방 퇴장 요청
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class LeaveRoomMessage implements WsMessage {
    private String roomId;
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.LEAVE_ROOM;
    }
}
