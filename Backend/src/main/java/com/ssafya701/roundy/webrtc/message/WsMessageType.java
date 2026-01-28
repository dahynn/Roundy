package com.ssafya701.roundy.webrtc.message;

/**
 * WebSocket 메시지 타입 정의
 */
public enum WsMessageType {
    // ========== Inbound (클라이언트 → 서버) ==========
    
    // 기존: 방 관리
    JOIN_ROOM,
    LEAVE_ROOM,
    
    // 신규: 8단계 로테이션
    SUBMIT_VOTE,          // 투표 제출 (첫인상/최종)
    SUBMIT_GAME_ANSWER,   // 게임 답변 제출
    
    // ========== Outbound (서버 → 클라이언트) ==========
    
    // 기존: 방 관리
    JOIN_OK,
    ROOM_STATE,
    
    // 기존: 로테이션 (PAIR_ONLY 모드)
    ROUND_START,
    ROUND_END,
    PAIR_ASSIGNED,
    
    // 신규: 8단계 로테이션
    STAGE_CHANGE,         // 스테이지 전환 (SELF_INTRO → VOTE_FIRST 등)
    SPEAKER_CHANGE,       // 자기소개 발언자 변경
    GAME_QUESTION,        // 게임 문제 출제
    MATCH_RESULT,         // 매칭 결과 (성공/실패)
    FACE_REVEAL_START,    // 얼굴 공개 시작
    PARTNER_LEFT,         // 1:1 대화 중 파트너 이탈
    
    // 공통
    ERROR
}
