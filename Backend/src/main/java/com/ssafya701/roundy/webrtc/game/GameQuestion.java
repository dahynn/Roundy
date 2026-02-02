package com.ssafya701.roundy.webrtc.game;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 이미지 게임 문제 데이터
 */
@Getter
@AllArgsConstructor
public class GameQuestion {
    
    /**
     * 문제 번호 (1~5)
     */
    private int questionNumber;
    
    /**
     * 문제 내용 (멘트)
     */
    private String question;
    
    /**
     * 우승자에게 부여할 뱃지 이름
     */
    private String badgeName;
}
