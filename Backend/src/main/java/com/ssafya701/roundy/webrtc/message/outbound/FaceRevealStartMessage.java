package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 얼굴 공개 시작 메시지 (서버 → 클라이언트)
 * 매칭 성공 커플이 얼굴 공개(FACE_REVEAL)에 동의했을 때 전송
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class FaceRevealStartMessage implements WsMessage {
    
    /**
     * 방 ID
     */
    private String roomId;
    
    /**
     * 얼굴 공개 시작 안내 메시지
     */
    private String message;
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.FACE_REVEAL_START;
    }
}
