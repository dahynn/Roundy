package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 서버 → 클라이언트: 페어 배정 (개별 전송, PAIR_ONLY 모드)
 * 각 페어별 독립 OpenVidu 세션으로 1대1 화상 채팅 제공
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class PairAssignedMessage implements WsMessage {
    private String roomId;           // 대그룹 방 ID
    private int roundNumber;         // 라운드 번호
    private Long partnerId;          // 파트너 ID (null이면 혼자)
    private String partnerNickname;  // 파트너 닉네임
    
    // 프라이빗 1대1 세션 정보
    private String privateSessionId; // 1대1 OpenVidu 세션 ID
    private String privateToken;     // 1대1 OpenVidu 토큰
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.PAIR_ASSIGNED;
    }
}
