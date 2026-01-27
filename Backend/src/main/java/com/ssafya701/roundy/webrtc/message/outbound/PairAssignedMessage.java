package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 서버 → 클라이언트: 페어 배정 (개별 전송, PAIR_ONLY 모드)
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class PairAssignedMessage implements WsMessage {
    private String roomId;
    private int roundNumber;
    private Long partnerId;  // null이면 혼자
    private String partnerNickname;  // null이면 혼자
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.PAIR_ASSIGNED;
    }
}
