package com.ssafya701.roundy.webrtc.message.inbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 게임 투표 제출 메시지 (클라이언트 → 서버)
 * 이미지 게임(IMAGE_GAME) 단계에서 사용
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class SubmitGameVoteMessage implements WsMessage {
    
    /**
     * 문제 번호 (1~5)
     */
    private int questionNumber;
    
    /**
     * 투표 대상 사용자 ID
     */
    private Long targetUserId;
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.SUBMIT_GAME_VOTE;
    }
}
