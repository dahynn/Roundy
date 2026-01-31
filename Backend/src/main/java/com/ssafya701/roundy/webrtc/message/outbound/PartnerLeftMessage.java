package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 파트너 이탈 메시지 (서버 → 클라이언트)
 * 1:1 대화 중 파트너가 나갔을 때 남은 참가자에게 전송
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class PartnerLeftMessage implements WsMessage {
    
    /**
     * 이탈한 파트너 사용자 ID
     */
    private Long partnerId;
    
    /**
     * 이탈한 파트너 닉네임
     */
    private String partnerNickname;
    
    /**
     * 안내 메시지
     */
    private String message;
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.PARTNER_LEFT;
    }
}
