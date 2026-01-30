package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 매칭 결과 메시지 (서버 → 클라이언트)
 * 매칭 결과 발표(MATCHING_RESULT) 단계에서 각 참가자에게 개별 전송
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class MatchResultMessage implements WsMessage {
    
    /**
     * 매칭 성공 여부 (쌍방 선택 시 true)
     */
    private boolean isMatched;
    
    /**
     * 매칭된 파트너 사용자 ID (매칭 실패 시 null)
     */
    private Long partnerId;
    
    /**
     * 매칭된 파트너 닉네임 (매칭 실패 시 null)
     */
    private String partnerNickname;
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.MATCH_RESULT;
    }
}
