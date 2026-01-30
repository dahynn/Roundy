package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 발언자 변경 메시지 (서버 → 클라이언트)
 * 자기소개(SELF_INTRO) 단계에서 발언권 부여 시 사용
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class SpeakerChangeMessage implements WsMessage {
    
    /**
     * 현재 발언자 사용자 ID
     */
    private Long speakerId;
    
    /**
     * 현재 발언자 닉네임
     */
    private String speakerNickname;
    
    /**
     * 남은 발언 시간 (초)
     */
    private int remainingSeconds;
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.SPEAKER_CHANGE;
    }
}
