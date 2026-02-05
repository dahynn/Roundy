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
 * @param requestId - 검증 완료 시 받은 requestId (선택)
 */
export const enterSession = (requestId?: string): Promise<SessionEnterResponse> =>
    client.post('/session/enter', { requestId });

/**
 * 세션 대기실 퇴장
 * DELETE /api/session/leave
 */
export const leaveSession = () =>
    client.delete('/session/leave');
