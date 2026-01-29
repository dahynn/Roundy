package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 얼굴 공개 시작 메시지 (서버 → 클라이언트)
 * 매칭 성공 커플에게만 프라이빗 1대1 룸 정보와 함께 전송
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class FaceRevealStartMessage implements WsMessage {
    
    /**
     * 기존 대그룹 방 ID
     */
    private String roomId;
    
    /**
     * 프라이빗 세션 ID (1대1 방)
     */
    private String privateSessionId;
    
    /**
     * 프라이빗 세션 OpenVidu 토큰
     */
    private String privateToken;
    
    /**
     * 파트너 사용자 ID
     */
    private Long partnerId;
    
    /**
     * 파트너 닉네임
     */
    private String partnerNickname;
    
    /**
     * 안내 메시지
     */
    private String message;
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.FACE_REVEAL_START;
    }
}
