package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 서버 → 클라이언트: 에러 메시지
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ErrorMessage implements WsMessage {
    private String code;
    private String message;
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.ERROR;
    }
}
