package com.ssafya701.roundy.webrtc.message.inbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 클라이언트 → 서버: 방 참가 요청
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class JoinRoomMessage implements WsMessage {
    private String roomId;
    private String requestId;

    public JoinRoomMessage(String roomId) {
        this.roomId = roomId;
    }
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.JOIN_ROOM;
    }
}
