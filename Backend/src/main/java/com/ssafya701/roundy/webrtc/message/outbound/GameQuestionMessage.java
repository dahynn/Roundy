package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 게임 문제 출제 메시지 (서버 → 클라이언트)
 * 이미지 게임(IMAGE_GAME) 단계에서 사용
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class GameQuestionMessage implements WsMessage {
    
    /**
     * 문제 ID
     */
    private Long questionId;
    
    /**
     * 문제 제목
     */
    private String questionTitle;
    
    /**
     * 문제 이미지 URL
     */
    private String imageUrl;
    
    /**
     * 선택지 (null인 경우 주관식)
     */
    private String[] options;
    
    /**
     * 답변 제한 시간 (초)
     */
    private int timeLimit;
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.GAME_QUESTION;
    }
}
