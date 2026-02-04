package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 파트너 재연결 메시지 (서버 → 클라이언트)
 * 
 * 1:1 대화 중 파트너가 재연결했음을 알림
 */
@Getter
@AllArgsConstructor
public class PartnerReconnectedMessage implements WsMessage {
    
    /**
     * 재연결한 파트너 ID
     */
    private Long partnerId;
    
    /**
     * 재연결한 파트너 닉네임
     */
    private String partnerNickname;
    
    /**
     * 알림 메시지
     */
    private String message;
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.PARTNER_RECONNECTED;
    }
}
