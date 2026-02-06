package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class StartTimerMessage implements WsMessage {

    private int totalSeconds;

    @Override
    public WsMessageType getType() {
        return WsMessageType.START_TIMER;
    }
}
