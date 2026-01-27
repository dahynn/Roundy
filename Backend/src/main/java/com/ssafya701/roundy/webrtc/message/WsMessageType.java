package com.ssafya701.roundy.webrtc.message;

/**
 * WebSocket 메시지 타입 정의
 */
public enum WsMessageType {
    // Inbound (클라이언트 → 서버)
    JOIN_ROOM,
    LEAVE_ROOM,
    
    // Outbound (서버 → 클라이언트)
    JOIN_OK,
    ROOM_STATE,
    ROUND_START,
    ROUND_END,
    PAIR_ASSIGNED,
    ERROR
}
