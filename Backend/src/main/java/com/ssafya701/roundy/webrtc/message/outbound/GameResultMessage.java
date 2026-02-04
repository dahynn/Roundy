package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/**
 * 게임 결과 발표 메시지 (서버 → 클라이언트)
 */
@Getter
@AllArgsConstructor
public class GameResultMessage implements WsMessage {
    
    /**
     * 문제 번호
     */
    private int questionNumber;
    
    /**
     * 문제 내용
     */
    private String question;
    
    /**
     * 우승자 정보
     */
    /**
     * 우승자 정보 (동점자 포함)
     */
    private List<WinnerDto> winners;
    
    /**
     * 부여된 뱃지
     */
    private String badge;
    
    /**
     * 전체 투표 결과
     */
    private List<VoteResultDto> voteResults;
    
    @Getter
    @AllArgsConstructor
    public static class WinnerDto {
        private Long userId;
        private String nickname;
        private int voteCount;
    }
    
    @Getter
    @AllArgsConstructor
    public static class VoteResultDto {
        private Long userId;
        private String nickname;
        private int voteCount;
    }
    
    @Override
    public WsMessageType getType() {
        return WsMessageType.GAME_RESULT;
    }
}
