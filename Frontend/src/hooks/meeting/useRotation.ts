// src/hooks/useRotation.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import type {
    RotationState,
    WsMessageType,
    JoinOkPayload,
    RoomStatePayload,
    StageChangePayload,
    PairAssignedPayload,
    MatchResultPayload
} from '../../types/meeting/rotaion';

// 연결 시 필요한 유저 정보 타입
interface UserProfile {
    userId: number;
    username: string;
    gender: 'MALE' | 'FEMALE';
    mode: 'FREE_TALK' | 'PAIR_ONLY';
}

export const useRotationSystem = (roomId: string, userProfile: UserProfile) => {
    const socketRef = useRef<WebSocket | null>(null);
    const timerRef = useRef<number | null>(null);

    const [state, setState] = useState<RotationState>({
        connected: false,
        roomId: null,
        currentStage: 'WAITING',
        remainingTime: 0,
        participants: [],
        currentPartner: null,
        lastMessage: null,
    });

    // --- 메시지 전송 헬퍼 ---
    const sendMessage = useCallback((type: WsMessageType, payload: any = {}) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            const message = { type, ...payload };
            socketRef.current.send(JSON.stringify(message));
            console.log(`[WS-SEND] ${type}:`, payload);
        } else {
            console.warn('[WS] 소켓 미연결 상태');
        }
    }, []);

    // --- 수신 메시지 핸들러 ---
    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data);
            console.log(`[WS-RECV] ${data.type}:`, data);

            switch (data.type) {
                // 방 참가 성공 -> OpenVidu 토큰 수신
                case 'JOIN_OK': {
                    const payload = data as JoinOkPayload;
                    setState(prev => ({
                        ...prev,
                        connected: true,
                        roomId: payload.roomId,
                        // 초기 대기실 접속용 토큰 저장 (필요 시 OpenVidu 훅으로 전달)
                        currentPartner: {
                            id: null,
                            nickname: 'Lobby',
                            sessionId: payload.roomId,
                            token: payload.token
                        }
                    }));
                    break;
                }

                // 참가자 목록 갱신
                case 'ROOM_STATE': {
                    const payload = data as RoomStatePayload;
                    setState(prev => ({
                        ...prev,
                        participants: payload.participants
                    }));
                    break;
                }

                // 스테이지 변경 (타이머 리셋)
                case 'STAGE_CHANGE': {
                    const payload = data as StageChangePayload;
                    setState(prev => ({
                        ...prev,
                        currentStage: payload.stage,
                        remainingTime: payload.durationSeconds,
                        lastMessage: `스테이지 변경: ${payload.stage}`
                    }));
                    break;
                }

                // 1:1 매칭 발생 (가장 중요) -> 여기서 OpenVidu 세션 갈아타야 함
                case 'PAIR_ASSIGNED': {
                    const payload = data as PairAssignedPayload;
                    setState(prev => ({
                        ...prev,
                        currentPartner: {
                            id: payload.partnerId,
                            nickname: payload.partnerNickname,
                            sessionId: payload.privateSessionId,
                            token: payload.privateToken // 이 토큰으로 OpenVidu 재접속
                        },
                        lastMessage: payload.partnerNickname
                            ? `${payload.partnerNickname}님과 매칭되었습니다.`
                            : '매칭 대상이 없습니다 (휴식).'
                    }));
                    break;
                }

                // 최종 결과
                case 'MATCH_RESULT': {
                    const payload = data as MatchResultPayload;
                    setState(prev => ({
                        ...prev,
                        lastMessage: payload.isMatched
                            ? `🎉 최종 매칭 성공! (${payload.partnerNickname})`
                            : '앗, 매칭에 실패했습니다.'
                    }));
                    break;
                }

                case 'VOTE_SUBMITTED':
                    setState(prev => ({ ...prev, lastMessage: '투표가 제출되었습니다.' }));
                    break;

                case 'ERROR':
                    console.error('[WS-ERROR]', data.message);
                    setState(prev => ({ ...prev, lastMessage: `에러: ${data.message}` }));
                    break;
            }
        } catch (err) {
            console.error('[WS] 파싱 에러:', err);
        }
    }, []);

    // --- WebSocket 연결 (쿼리 파라미터 적용) ---
    useEffect(() => {
        //  문서에 명시된 쿼리 파라미터 구조 적용
        const params = new URLSearchParams({
            userId: userProfile.userId.toString(),
            username: userProfile.username,
            gender: userProfile.gender,
            mode: userProfile.mode
        }).toString();

        // 엔드포인트
        const WS_URL = `ws://localhost:8080/ws/roundy?${params}`;

        const socket = new WebSocket(WS_URL);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log('[WS] Connected');
            //  연결 후 JOIN_ROOM 메시지 전송 (JOIN 아님!)
            sendMessage('JOIN_ROOM', { roomId });
        };

        socket.onmessage = handleMessage;
        socket.onclose = () => setState(prev => ({ ...prev, connected: false }));

        return () => socket.close();
    }, [roomId, userProfile.userId]); // userId 변경 시 재연결

    // --- 타이머 ---
    useEffect(() => {
        if (state.remainingTime > 0) {
            timerRef.current = window.setInterval(() => {
                setState(prev => ({ ...prev, remainingTime: Math.max(0, prev.remainingTime - 1) }));
            }, 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [state.remainingTime]);

    // --- 액션 함수들 ---
    // targetUserId 필드명 준수
    const submitVote = (targetUserId: number) => {
        sendMessage('SUBMIT_VOTE', { targetUserId });
    };

    // answer 필드명 준수
    const submitGameAnswer = (answer: string) => {
        sendMessage('SUBMIT_GAME_ANSWER', { answer });
    };

    const leaveRoom = () => {
        sendMessage('LEAVE_ROOM', { roomId });
    };

    return { state, submitVote, submitGameAnswer, leaveRoom };
};