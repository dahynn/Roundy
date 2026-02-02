package com.ssafya701.roundy.webrtc.rotation;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.ToString;

/**
 * 라운드 정보
 */
@Getter
@AllArgsConstructor
@ToString
public class RoundInfo {
    private final int currentRound;
    private final int totalRounds;
    private final int durationSeconds;
    
    /**
     * 다음 라운드 정보 생성
     */
    public RoundInfo nextRound() {
        return new RoundInfo(currentRound + 1, totalRounds, durationSeconds);
    }
    
    /**
     * 마지막 라운드 여부 확인
     */
    public boolean isLastRound() {
        return currentRound >= totalRounds;
    }
}
