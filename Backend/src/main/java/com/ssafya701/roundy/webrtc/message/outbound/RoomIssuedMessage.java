package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 서버가 WebSocket 연결 직후 발급하는 roomId 안내 메시지
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class RoomIssuedMessage implements WsMessage {
    private String roomId;

    @Override
    public WsMessageType getType() {
        return WsMessageType.ROOM_ISSUED;
    }
}
