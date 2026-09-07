package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 단체방 복귀용 새 일회성 접속 정보. 참가자 본인에게만 전송한다. */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class MediaSessionMessage implements WsMessage {
    private String roomId;
    private long stageSequence;
    private String sessionId;
    private String token;

    @Override
    public WsMessageType getType() { return WsMessageType.MEDIA_SESSION; }
}
