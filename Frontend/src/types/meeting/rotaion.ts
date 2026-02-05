// 문서에 정의된 스테이지 목록 (UI 상태용)
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
    | 'STAGE_CHANGE' // Restored for RotationTest compatibility
    | 'ROUND_START' // Changed from STAGE_CHANGE
    | 'ROUND_END'
    | 'PAIR_ASSIGNED'
    | 'VOTE_SUBMITTED'
    | 'MATCH_RESULT'
    | 'KICK'
    | 'ERROR'
    | 'FACE_REVEAL_START' // 최종 매칭 성공 시 1:1 연결 시작
    | 'SPEAKER_CHANGE'   // 자기소개 발언자 변경
    | 'GAME_QUESTION'    // 이미지 게임 문제 출제
    | 'GAME_RESULT'      // 이미지 게임 결과 발표
    | 'BREAK'            // [NEW] 단계 사이 휴식
    | 'FIRST_VOTE_RESULT'; // [NEW] 첫인상 투표 결과

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
    gender: 'MALE' | 'FEMALE';
}

export interface RoomStatePayload {
    roomId: string;
    participants: Participant[];
    participantCount: number;
}

// STAGE_CHANGE: 스테이지 변경
export interface StageChangePayload {
    roomId: string;
    stage: RotationStage;
    durationSeconds: number;
}

// ROUND_START: 라운드 시작
export interface RoundStartPayload {
    roomId: string;
    roundNumber: number;
    durationSeconds: number;
}

// ROUND_END: 라운드 종료
export interface RoundEndPayload {
    roomId: string;
    roundNumber: number;
}

// PAIR_ASSIGNED: 1:1 매칭 (핵심)
export interface PairAssignedPayload {
    roomId: string;
    roundNumber: number;
    partnerId: number | null;
    partnerNickname: string | null;
    // Spec doesn't explicitly mention private tokens anymore, but keeping optional for compatibility if needed.
    privateSessionId?: string;
    privateToken?: string;
}

// MATCH_RESULT: 최종 매칭 결과
export interface MatchResultPayload {
    isMatched: boolean;
    partnerId: number | null;
    partnerNickname: string | null;
}

// FACE_REVEAL_START: 최종 매칭 성공 시 1:1 화상 연결 정보
export interface FaceRevealStartPayload {
    roomId: string; // "room-088c6574"
    type: 'FACE_REVEAL_START';
    message?: string; // "매칭되었습니다! 프라이빗 룸으로 이동하여 얼굴을 공개하세요." (선택적)
    partnerId: number; // 201
    partnerNickname: string; // "윤서현"
    privateSessionId: string; // "room-088c6574-private-102-201"
    privateToken: string; // "ws://localhost:4443?sessionId=..."
}

// SPEAKER_CHANGE: 자기소개 발언자 변경 정보
export interface SpeakerChangePayload {
    type: 'SPEAKER_CHANGE';
    speakerId: number;        // 발언권자 ID
    speakerNickname: string;  // 발언권자 닉네임 (백엔드 필드명 일치)
    remainingSeconds: number; // 발언 시간 (초)
}

// GAME_QUESTION: 이미지 게임 문제
export interface GameQuestionPayload {
    type: 'GAME_QUESTION';
    questionNumber: number;
    totalQuestions: number;
    question: string;         // "가장 먼저 결혼할 것 같은 사람은?"
    timeLimitSeconds: number; // 5초
    candidates: {
        userId: number;
        nickname: string;
    }[];
}

// GAME_RESULT: 이미지 게임 결과
export interface GameResultPayload {
    type: 'GAME_RESULT';
    questionNumber: number;
    question: string;
    winners: {           // ✨ 동점자 가능하므로 배열
        userId: number;
        nickname: string;
        voteCount: number;
    }[];
    voteResults: {       // 전체 득표 현황 (선택적 사용)
        userId: number;
        nickname: string;
        voteCount: number;
    }[];
}

// 클라이언트 -> 서버 전송용 (이미지 게임 답변)
export interface GameAnswerPayload {
    questionIndex: number;
    targetUserId: number;
}

// [NEW] BREAK: 휴식 시간
export interface BreakPayload {
    type: 'BREAK';
    durationSeconds: number;
}

// [NEW] FIRST_VOTE_RESULT: 첫인상 투표 결과
export interface VoteResultItem {
    voterId: number;
    targetId: number | null; // null이면 기권
}

export interface FirstVoteResultPayload {
    type: 'FIRST_VOTE_RESULT';
    results: VoteResultItem[];
}

// --- State Interface ---
export interface RotationState {
    connected: boolean;
    roomId: string | null;
    mode: 'FREE_TALK' | 'PAIR_ONLY' | null; // Added mode
    currentStage: RotationStage | 'ROUND_IN_PROGRESS' | 'ROUND_WAITING'; // Extended
    currentRound: number; // Added
    totalRounds: number; // Added
    remainingTime: number;

    // 사용자 정보
    participants: Participant[];

    // 현재 발언자 정보 (자기소개 단계)
    currentSpeaker?: {
        id: number;
        speakerNickname: string;
        remainingTime: number;
    } | null;

    // 이미지 게임 정보
    currentGame?: {
        state: 'QUESTION' | 'RESULT';
        question?: string;
        questionNumber?: number;
        totalQuestions?: number;
        data?: GameQuestionPayload | GameResultPayload;
    } | null;

    // 리다이렉트/이동 정보 (KICK 등)
    redirectInfo?: {
        message: string;
        targetPath: string;
        remainingSeconds: number;
    } | null;

    // 매칭/로테이션 정보
    currentPartner: {
        id: number | null;
        nickname: string | null;
        sessionId?: string | null;
        token?: string | null;
    } | null;

    // 시스템 메시지/에러
    lastMessage: string | null;

    // [NEW] 첫인상 투표 결과
    firstVoteResults?: VoteResultItem[] | null;
}

// KICK: 강제 퇴장
export interface KickPayload {
    type: 'KICK';
    reason: string;
}

// ERROR: 에러 메시지
export interface ErrorPayload {
    type: 'ERROR';
    code: string;
    message: string;
}