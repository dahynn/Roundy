package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/**
 * 게임 문제 출제 메시지 (서버 → 클라이언트)
 */
@Getter
@AllArgsConstructor
public class GameQuestionMessage implements WsMessage {
    
    private int questionNumber;
    private int totalQuestions;
    private String question;
    private int votingTimeSeconds;
    private List<CandidateDto> candidates;
    
    @Getter
    @AllArgsConstructor
    public static class CandidateDto {
        private Long userId;
        private String nickname;
    }
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.GAME_QUESTION;
    }
}
