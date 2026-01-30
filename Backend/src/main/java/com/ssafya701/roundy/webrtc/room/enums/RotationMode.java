package com.ssafya701.roundy.webrtc.room.enums;

/**
 * 방의 로테이션 모드 정의
 * - FREE_TALK: 모든 참가자가 자유롭게 대화 (페어링 없음)
 * - PAIR_ONLY: 라운드마다 1:1 페어로 매칭
 */
public enum RotationMode {
    FREE_TALK,
    PAIR_ONLY
}
