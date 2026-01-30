// 문서에 정의된 스테이지 목록
export type RotationStage =
    | 'WAITING'
    | 'SELF_INTRO'
    | 'VOTE_FIRST'
    | 'ROTATION_SHORT'
    | 'ROTATION_LONG'
    | 'IMAGE_GAME'
    | 'VOTE_FINAL'
    | 'MATCHING_RESULT'
    | 'FACE_REVEAL';

// 문서에 정의된 메시지 타입 목록
export type WsMessageType =
// Client -> Server
    | 'JOIN_ROOM'
    | 'LEAVE_ROOM'
    | 'SUBMIT_VOTE'
    | 'SUBMIT_GAME_ANSWER'
    // Server -> Client
    | 'JOIN_OK'
    | 'ROOM_STATE'
    | 'STAGE_CHANGE'
    | 'PAIR_ASSIGNED'
    | 'VOTE_SUBMITTED'
    | 'MATCH_RESULT'
    | 'ERROR';

// --- 기본 메시지 구조 ---
export interface WsMessage<T = any> {
    type: WsMessageType;
    [key: string]: any; // 유동적인 필드 처리를 위해
}

// --- Payload Interfaces (서버 수신 데이터) ---

// JOIN_OK: 방 참가 성공 및 초기 정보
export interface JoinOkPayload {
    roomId: string;
    openviduUrl: string;
    token: string; // 대기실용 메인 토큰
    mode: 'FREE_TALK' | 'PAIR_ONLY';
    roundInfo?: {
        currentRound: number;
        totalRounds: number;
        durationSeconds: number;
    };
}

// ROOM_STATE: 참가자 목록 업데이트
export interface Participant {
    userId: number;
    nickname: string;
}

export interface RoomStatePayload {
    roomId: string;
    participants: Participant[];
    participantCount: number;
}

// STAGE_CHANGE: 스테이지 전환
export interface StageChangePayload {
    roomId: string;
    stage: RotationStage;
    durationSeconds: number;
}

// PAIR_ASSIGNED: 1:1 매칭 (핵심)
export interface PairAssignedPayload {
    roomId: string;
    roundNumber: number;
    partnerId: number | null;
    partnerNickname: string | null;
    privateSessionId: string;
    privateToken: string; // 1:1 대화용 토큰
}

// MATCH_RESULT: 최종 매칭 결과
export interface MatchResultPayload {
    isMatched: boolean;
    partnerId: number | null;
    partnerNickname: string | null;
}

// --- State Interface ---
export interface RotationState {
    connected: boolean;
    roomId: string | null;
    currentStage: RotationStage;
    remainingTime: number;

    // 사용자 정보
    participants: Participant[];

    // 매칭/로테이션 정보
    currentPartner: {
        id: number | null;
        nickname: string | null;
        sessionId: string | null; // OpenVidu Session ID
        token: string | null;     // OpenVidu Token
    } | null;

    // 시스템 메시지/에러
    lastMessage: string | null;
}