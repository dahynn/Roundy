package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
public class StartTimerMessage implements WsMessage {

    private int totalSeconds;
    private long stageSequence;

    public StartTimerMessage(int totalSeconds) { this(totalSeconds, 0); }

    @Override
    public WsMessageType getType() {
        return WsMessageType.START_TIMER;
    }
}
