package com.ssafya701.roundy.webrtc.message.inbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class RenderCompleteMessage implements WsMessage {
    
    private String stage;

    @Override
    public WsMessageType getType() {
        return WsMessageType.RENDER_COMPLETE;
    }
}
