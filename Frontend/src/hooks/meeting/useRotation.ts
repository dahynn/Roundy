import { useEffect, useRef, useState, useCallback } from 'react';
import type {
    RotationState,
    WsMessageType,
    JoinOkPayload,
    RoomStatePayload,
    StageChangePayload,
    PairAssignedPayload,
    MatchResultPayload,
    KickPayload,
    ErrorPayload,
    // RotationStage // Import Stage Type
} from '../../types/meeting/rotaion';

interface UserProfile {
    userId: number;
    username: string;
    gender: 'MALE' | 'FEMALE';
    mode: 'FREE_TALK' | 'PAIR_ONLY';
}

// 로비(대기실) 접속 정보 저장을 위한 타입
interface LobbyCredentials {
    sessionId: string;
    token: string;
}

export const useRotationSystem = (roomId: string, userProfile: UserProfile) => {
    const socketRef = useRef<WebSocket | null>(null);
    const timerRef = useRef<number | null>(null);

    const [state, setState] = useState<RotationState & { lobbyCredentials?: LobbyCredentials }>({
        connected: false,
        roomId: null,
        currentStage: 'WAITING',
        remainingTime: 0,
        participants: [],
        currentPartner: null,
        lastMessage: null,
        lobbyCredentials: undefined, // 초기 대기실 토큰 저장용
    });

    const sendMessage = useCallback((type: WsMessageType, payload: any = {}) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            const message = { type, ...payload };
            socketRef.current.send(JSON.stringify(message));
        }
    }, []);

    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data);
            console.log(`[WS-RECV] ${data.type}:`, data);

            switch (data.type) {
                case 'JOIN_OK': {
                    const payload = data as JoinOkPayload;
                    const lobbyInfo = {
                        sessionId: payload.roomId,
                        token: payload.token
                    };

                    setState(prev => ({
                        ...prev,
                        connected: true,
                        roomId: payload.roomId,
                        lobbyCredentials: lobbyInfo, // 로비 정보 백업
                        // 처음엔 대기실로 연결
                        currentPartner: {
                            id: null,
                            nickname: 'Lobby',
                            sessionId: lobbyInfo.sessionId,
                            token: lobbyInfo.token
                        }
                    }));
                    break;
                }

                case 'ROOM_STATE': {
                    const payload = data as RoomStatePayload;
                    setState(prev => ({
                        ...prev,
                        participants: payload.participants
                    }));
                    break;
                }

                case 'STAGE_CHANGE': {
                    const payload = data as StageChangePayload;

                    // 스테이지가 변경될 때, 로테이션(1:1) 단계가 아니면 다시 로비(단체방) 세션으로 복귀해야 함
                    // 예: 로테이션 끝 -> 중간 투표(VOTE_FIRST) -> 다시 로비 세션 필요
                    const isPairStage = ['ROTATION_SHORT', 'ROTATION_LONG', 'FACE_REVEAL'].includes(payload.stage);

                    setState(prev => {
                        let nextPartner = prev.currentPartner;

                        // 1:1 스테이지가 아니고, 현재 로비 세션이 아니라면 -> 로비로 복귀
                        if (!isPairStage && prev.lobbyCredentials) {
                            nextPartner = {
                                id: null,
                                nickname: 'Lobby',
                                sessionId: prev.lobbyCredentials.sessionId,
                                token: prev.lobbyCredentials.token
                            };
                        }

                        return {
                            ...prev,
                            currentStage: payload.stage,
                            remainingTime: payload.durationSeconds,
                            currentPartner: nextPartner, // 세션 정보 업데이트 (필요 시 OpenVidu 재접속 유발)
                            lastMessage: `스테이지 변경: ${payload.stage}`
                        };
                    });
                    break;
                }

                case 'PAIR_ASSIGNED': {
                    const payload = data as PairAssignedPayload;
                    setState(prev => ({
                        ...prev,
                        // 1:1 매칭 정보를 덮어씌움 -> RotationTest에서 감지하여 OpenVidu 세션 변경
                        currentPartner: {
                            id: payload.partnerId,
                            nickname: payload.partnerNickname,
                            sessionId: payload.privateSessionId,
                            token: payload.privateToken
                        },
                        lastMessage: payload.partnerNickname
                            ? `${payload.partnerNickname}님과 1:1 매칭!`
                            : '매칭 휴식 (대기)'
                    }));
                    break;
                }

                case 'MATCH_RESULT': {
                    const payload = data as MatchResultPayload;
                    setState(prev => ({
                        ...prev,
                        lastMessage: payload.isMatched
                            ? `🎉 최종 커플: ${payload.partnerNickname}`
                            : '최종 매칭 실패 ㅠㅠ'
                    }));
                    break;
                }

                case 'VOTE_SUBMITTED':
                    setState(prev => ({ ...prev, lastMessage: '투표 완료!' }));
                    break;

                case 'KICK': {
                    const payload = data as KickPayload;
                    alert(`강제 퇴장: ${payload.reason}`);
                    socketRef.current?.close();
                    // 홈으로 리다이렉트
                    window.location.href = '/';
                    break;
                }

                case 'ERROR': {
                    const payload = data as ErrorPayload;
                    console.error(`[WS-ERROR] ${payload.code}:`, payload.message);

                    // 입장 관련 에러 처리
                    if (payload.code === 'ROOM_FULL' || payload.code === 'GAME_IN_PROGRESS') {
                        alert(payload.message);
                        setState(prev => ({
                            ...prev,
                            connected: false,
                            roomId: null,
                            lastMessage: payload.message
                        }));
                    } else {
                        // 기타 에러는 메시지만 표시
                        setState(prev => ({
                            ...prev,
                            lastMessage: `오류: ${payload.message}`
                        }));
                    }
                    break;
                }
            }
        } catch (err) {
            console.error('[WS] Parsing Error:', err);
        }
    }, []);

    // WebSocket 연결 (생략 가능하지만 전체 흐름 유지 위해 포함)
    useEffect(() => {
        if (!roomId) return;

        const params = new URLSearchParams({
            userId: userProfile.userId.toString(),
            username: userProfile.username,
            gender: userProfile.gender,
            mode: userProfile.mode
        }).toString();

        const baseUrl = import.meta.env.VITE_WS_URL;
        const WS_URL = `${baseUrl}?${params}`;

        const socket = new WebSocket(WS_URL);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log('[WS] Connected');
            sendMessage('JOIN_ROOM', { roomId });
        };

        socket.onmessage = handleMessage;
        socket.onclose = () => setState(prev => ({ ...prev, connected: false }));

        return () => socket.close();
    }, [roomId, userProfile.userId, sendMessage, handleMessage]);

    // 타이머
    useEffect(() => {
        if (state.remainingTime > 0) {
            timerRef.current = window.setInterval(() => {
                setState(prev => ({ ...prev, remainingTime: Math.max(0, prev.remainingTime - 1) }));
            }, 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [state.remainingTime]);

    const submitVote = (targetUserId: number) => sendMessage('SUBMIT_VOTE', { targetUserId });
    const submitGameAnswer = (answer: string) => sendMessage('SUBMIT_GAME_ANSWER', { answer });
    const leaveRoom = () => sendMessage('LEAVE_ROOM', { roomId });

    return { state, submitVote, submitGameAnswer, leaveRoom };
};