package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 서버 → 클라이언트: 방 상태 업데이트 (브로드캐스트)
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class RoomStateMessage implements WsMessage {
    private String roomId;
    private List<ParticipantDto> participants;
    private int participantCount;
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.ROOM_STATE;
    }
    
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParticipantDto {
        private Long userId;
        private String nickname;
    }
}
