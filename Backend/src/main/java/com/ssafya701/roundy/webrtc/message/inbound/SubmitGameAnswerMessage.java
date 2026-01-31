package com.ssafya701.roundy.webrtc.message.inbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 게임 답변 제출 메시지 (클라이언트 → 서버)
 * 이미지 게임(IMAGE_GAME) 단계에서 사용
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class SubmitGameAnswerMessage implements WsMessage {
    
    /**
     * 게임 문제에 대한 답변
     */
    private String answer;
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.SUBMIT_GAME_ANSWER;
    }
}
