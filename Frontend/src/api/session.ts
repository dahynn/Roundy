import client from './_client';

/**
 * Session API Response Types
 */
export interface SessionStatusResponse {
    maleCount: number;
    femaleCount: number;
    totalCount: number;
    availableSlots: number;
}

export interface SessionEnterResponse {
    success: boolean;
    message: string;
    queuePosition: number | null;
    roomId: string | null;
    gender: string | null;
}

/**
 * 세션 현황 조회
 * GET /api/session/status
 * 
 * @returns 현재 세션의 남/녀 참여자 수, 총 수용 인원, 남은 자리 수
 */
export const getSessionStatus = (): Promise<SessionStatusResponse> =>
    client.get('/session/status');

/**
 * 세션 입장 요청 (매칭 폴링)
 * POST /api/session/enter
 * 
 * @param requestId - 첫 대기열 입장에 필요한 얼굴 검증 requestId.
 * 이미 대기열에 들어간 사용자의 폴링 요청에서는 서버가 기존 상태를 확인한다.
 */
export const enterSession = (requestId?: string): Promise<SessionEnterResponse> =>
    client.post('/session/enter', { requestId });

/**
 * 세션 대기실 퇴장
 * DELETE /api/session/leave
 */
export const leaveSession = () =>
    client.delete('/session/leave');
