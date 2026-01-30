package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 투표 제출 확인 메시지 (서버 → 클라이언트)
 * 사용자가 투표를 제출했을 때 성공 확인 및 진행 상황 전달
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class VoteSubmittedMessage implements WsMessage {
    
    /**
     * 투표 타입 (첫인상/최종)
     */
    private String voteType;  // "FIRST" 또는 "FINAL"
    
    /**
     * 투표 완료 여부
     */
    private boolean success;
    
    /**
     * 확인 메시지
     */
    private String message;
    
    /**
     * 현재 투표 완료 인원 (옵션)
     */
    private Integer votedCount;
    
    /**
     * 전체 참가 인원 (옵션)
     */
    private Integer totalCount;
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.VOTE_SUBMITTED;
    }
}
