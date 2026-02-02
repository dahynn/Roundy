package com.ssafya701.roundy.webrtc.message.inbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 투표 제출 메시지 (클라이언트 → 서버)
 * 첫인상 투표(VOTE_FIRST) 또는 최종 투표(VOTE_FINAL)에서 사용
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class SubmitVoteMessage implements WsMessage {
    
    /**
     * 투표 대상 사용자 ID
     */
    private Long targetUserId;
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.SUBMIT_VOTE;
    }
}
