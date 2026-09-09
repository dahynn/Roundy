import { useEffect, useRef, useState, useCallback } from 'react';
import { getWebSocketUrl } from '@/config/endpoints';
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
    FaceRevealStartPayload, // Import FaceRevealStartPayload
    SpeakerChangePayload, // Import SpeakerChangePayload
    FirstVoteResultPayload,
    GameQuestionPayload,
    GameResultPayload,
    PartnerConnectionPayload,
    RoundStartPayload,
    RoundEndPayload,
    GameAnswerPayload,
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



export const useRotationSystem = (roomId: string | null, token: string | null, userProfile: UserProfile | null) => {
    const socketRef = useRef<WebSocket | null>(null);
    const timerRef = useRef<number | null>(null);
    const deadlineRef = useRef<number | null>(null);
    const stageSequenceRef = useRef(0);
    const timerSequenceRef = useRef<number | null>(null);

    const [state, setState] = useState<RotationState & { lobbyCredentials?: LobbyCredentials }>({
        connected: false,
        roomId: null,
        mode: null,
        currentStage: 'WAITING',
        currentRound: 0,
        totalRounds: 0,
        remainingTime: 0,
        totalTime: 0, // [NEW]
        isBreak: false, // [NEW]
        stageSequence: 0,
        participants: [],
        currentSpeaker: null,
        redirectInfo: null,
        currentPartner: null,
        lastMessage: null,
        lobbyCredentials: undefined, // 초기 대기실 토큰 저장용
    });

    const sendMessage = useCallback((type: WsMessageType, payload: Record<string, unknown> = {}) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            const message = { type, ...payload };
            socketRef.current.send(JSON.stringify(message));
        }
    }, []);

    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data);

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
                        mode: payload.mode,
                        currentRound: payload.roundInfo?.currentRound ?? 0,
                        totalRounds: payload.roundInfo?.totalRounds ?? 0,
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
                    if (payload.stageSequence <= stageSequenceRef.current) break;
                    stageSequenceRef.current = payload.stageSequence;
                    deadlineRef.current = null;
                    timerSequenceRef.current = null;

                    setState(prev => {
                        // FACE_REVEAL_START 메시지가 먼저 도착했을 경우 성공 메시지를 유지하기 위함
                        const shouldKeepMessage = payload.stage === 'FACE_REVEAL' && prev.lastMessage?.includes('매칭되었습니다');

                        return {
                            ...prev,
                            currentStage: payload.stage,
                            stageSequence: payload.stageSequence,
                            remainingTime: payload.durationSeconds,
                            totalTime: payload.durationSeconds, // [NEW] 전체 시간 설정
                            isBreak: false, // [NEW] 스테이지 시작 시 휴식 해제
                            currentSpeaker: null, // 스테이지 변경 시 발언자 정보 초기화
                            firstVoteResults: null,
                            lastMessage: shouldKeepMessage ? prev.lastMessage : `스테이지 변경: ${payload.stage}`
                            // firstVoteResults: null // [FIX] React Batching 문제로 삭제 (Meeting.tsx에서 자동 숨김 처리)
                        };
                    });
                    break;
                }

                case 'START_TIMER': {
                    if (data.stageSequence !== stageSequenceRef.current || timerSequenceRef.current === data.stageSequence) break;
                    timerSequenceRef.current = data.stageSequence;
                    deadlineRef.current = Date.now() + data.totalSeconds * 1000;
                    setState(prev => ({ ...prev, remainingTime: data.totalSeconds, totalTime: data.totalSeconds }));
                    break;
                }

                case 'MEDIA_SESSION': {
                    if (data.stageSequence < stageSequenceRef.current) break;
                    setState(prev => ({ ...prev,
                        lobbyCredentials: { sessionId: data.sessionId, token: data.token },
                        currentPartner: { id: null, nickname: 'Lobby', sessionId: data.sessionId, token: data.token },
                    }));
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
                        matchResult: payload, // [NEW] 최종 결과 저장 (UI 표시용)
                        lastMessage: payload.matched
                            ? `🎉 최종 커플: ${payload.partnerNickname}`
                            : '최종 매칭 실패 ㅠㅠ'
                    }));
                    break;
                }

                case 'ROUND_START': {
                    const payload = data as RoundStartPayload;
                    setState(prev => ({
                        ...prev,
                        currentRound: payload.roundNumber,
                        remainingTime: payload.durationSeconds,
                        totalTime: payload.durationSeconds,
                    }));
                    break;
                }

                case 'ROUND_END': {
                    const payload = data as RoundEndPayload;
                    setState(prev => prev.currentRound === payload.roundNumber
                        ? { ...prev, remainingTime: 0 }
                        : prev);
                    break;
                }

                case 'GAME_QUESTION': {
                    const payload = data as GameQuestionPayload;
                    setState(prev => ({
                        ...prev,
                        currentGame: {
                            state: 'QUESTION', question: payload.question,
                            questionNumber: payload.questionNumber,
                            totalQuestions: payload.totalQuestions, data: payload,
                        },
                        remainingTime: payload.votingTimeSeconds,
                        totalTime: payload.votingTimeSeconds,
                    }));
                    break;
                }

                case 'GAME_RESULT': {
                    const payload = data as GameResultPayload;
                    setState(prev => ({
                        ...prev,
                        currentGame: {
                            state: 'RESULT', question: payload.question,
                            questionNumber: payload.questionNumber, data: payload,
                        },
                    }));
                    break;
                }

                case 'PARTNER_LEFT': {
                    const payload = data as PartnerConnectionPayload;
                    setState(prev => ({ ...prev, lastMessage: payload.message || '상대방의 연결이 끊겼습니다.' }));
                    break;
                }

                case 'PARTNER_RECONNECTED': {
                    const payload = data as PartnerConnectionPayload;
                    setState(prev => ({ ...prev, lastMessage: payload.message || '상대방이 다시 연결되었습니다.' }));
                    break;
                }

                case 'FACE_REVEAL_START': {
                    const payload = data as FaceRevealStartPayload;
                    setState(prev => ({
                        ...prev,
                        // 1:1 매칭이 되었을 때, 프라이빗 룸 연결 정보로 업데이트
                        currentPartner: {
                            id: payload.partnerId,
                            nickname: payload.partnerNickname,
                            sessionId: payload.privateSessionId,
                            token: payload.privateToken
                        },
                        redirectInfo: null, // 혹시 설정되었을 수 있는 강퇴/리다이렉트 정보 제거
                        // 사용자 요청: 매칭된 사용자 이름 + 님과 매칭되었습니다. 안내
                        lastMessage: `${payload.partnerNickname}님과 매칭되었습니다! 프라이빗 룸으로 이동합니다.`
                    }));
                    break;
                }

                case 'SPEAKER_CHANGE': {
                    const payload = data as SpeakerChangePayload;
                    setState(prev => ({
                        ...prev,
                        currentSpeaker: {
                            id: payload.speakerId,
                            speakerNickname: payload.speakerNickname, // 백엔드 필드명 일치
                            remainingTime: payload.remainingSeconds
                        },
                        // 타이머 동기화 (선택 사항: 서버에서 주는 remainingTime 사용)
                        remainingTime: payload.remainingSeconds
                    }));
                    break;
                }



                case 'VOTE_SUBMITTED':
                    setState(prev => ({ ...prev, lastMessage: '투표 완료!' }));
                    break;

                case 'BREAK': {
                    const payload = data as import('../../types/meeting/rotaion').BreakPayload;
                    if (payload.stageSequence <= stageSequenceRef.current) break;
                    stageSequenceRef.current = payload.stageSequence;
                    deadlineRef.current = null;
                    timerSequenceRef.current = null;
                    setState(prev => ({
                        ...prev,
                        currentStage: 'BREAK',
                        stageSequence: payload.stageSequence,
                        remainingTime: payload.durationSeconds,
                        totalTime: payload.durationSeconds,
                        // totalTime: payload.durationSeconds, // 휴식 시간도 게이지로 보여줄지 여부 -> 일단은 유지 or 업데이트? 보통 휴식은 짧아서 업데이트 권장
                        isBreak: true, // [NEW] 휴식 상태 진입
                        lastMessage: '잠시 후 다음 단계로 이동합니다...'
                    }));
                    break;
                }

                case 'FIRST_VOTE_RESULT': {
                    console.log('📊 [WS] FIRST_VOTE_RESULT Received:', data);
                    const payload = data as FirstVoteResultPayload;
                    setState(prev => ({
                        ...prev,
                        firstVoteResults: payload.results,
                        lastMessage: '첫인상 투표 결과 집계 완료!'
                    }));
                    break;
                }

                case 'KICK': {
                    const payload = data as KickPayload;
                    // alert(`강제 퇴장: ${payload.reason}`); // 제거
                    // socketRef.current?.close(); // 리다이렉트 직전에 종료하도록 변경

                    setState(prev => ({
                        ...prev,
                        lastMessage: `퇴장 안내: ${payload.reason}`,
                        redirectInfo: {
                            message: `${payload.reason}\n잠시 후 홈으로 이동합니다.`,
                            targetPath: '/home',
                            remainingSeconds: 3 // 3초 카운트다운
                        }
                    }));
                    break;
                }

                case 'ERROR': {
                    const payload = data as ErrorPayload;
                    console.error(`[WS-ERROR] ${payload.code}:`, payload.message);

                    // 입장 관련 에러 처리
                    if (payload.code === 'ROOM_FULL' || payload.code === 'GAME_IN_PROGRESS'
                        || payload.code === 'ROOM_ACCESS_DENIED' || payload.code === 'NO_ROOM_ASSIGNED') {
                        setState(prev => ({
                            ...prev,
                            connected: false,
                            roomId: null,
                            lastMessage: payload.message,
                            redirectInfo: { message: payload.message, targetPath: '/home', remainingSeconds: 3 },
                        }));
                    } else if (payload.code === 'OPENVIDU_ERROR') {
                        // OpenVidu 에러는 치명적이지 않을 수 있으므로 경고만 표시하고 연결은 유지 시도
                        console.error('🚨 OpenVidu Error:', payload.message);
                        setState(prev => ({
                            ...prev,
                            lastMessage: `⚠️ 화상 연결 오류: ${payload.message}`
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

    // WebSocket 연결 (가이드 준수)
    // 1. URL: same-origin WebSocket (VITE_WS_URL 설정 시 해당 주소 사용) + ?token={token}
    // 2. JOIN_ROOM: 연결 후 전송
    useEffect(() => {
        // roomId는 연결 URL에 필요 없지만, JOIN_ROOM 메시지에는 필요함
        // 연결 로직은 token이 있을 때만 시도
        if (!token || !roomId) return;

        stageSequenceRef.current = 0;
        timerSequenceRef.current = null;
        deadlineRef.current = null;
        setState(prev => ({ ...prev, connected: false, roomId: null, currentStage: 'WAITING',
            stageSequence: 0, remainingTime: 0, totalTime: 0, isBreak: false, participants: [],
            currentSpeaker: null, currentPartner: null, lobbyCredentials: undefined,
            firstVoteResults: null, matchResult: null, redirectInfo: null, lastMessage: null }));

        const baseUrl = getWebSocketUrl();

        const url = new URL(baseUrl, window.location.href);
        url.searchParams.set('token', token);

        const socket = new WebSocket(url.toString());
        socketRef.current = socket;

        socket.onopen = () => {
            console.log('[WS] Connected');
            // 가이드상 JOIN_ROOM 전송 권장
            if (roomId) {
                sendMessage('JOIN_ROOM', { roomId });
            }
        };

        socket.onmessage = handleMessage;
        socket.onclose = (event) => {
            deadlineRef.current = null;
            console.log('[WS] Disconnected:', event.code, event.reason);
            setState(prev => ({ ...prev, connected: false }));
        };

        socket.onerror = (error) => {
            console.error('[WS] Error:', error);
        };

        return () => {
            console.log('[WS] Closing connection');
            socket.close();
            socket.onopen = null;
            socket.onerror = null;
            socket.onmessage = null;
            socket.onclose = null;
            if (socketRef.current === socket) socketRef.current = null;
            deadlineRef.current = null;
        };
    }, [token, roomId, sendMessage, handleMessage]); // userProfile 의존성 제거

    // 타이머 (기존 게임 타이머)
    useEffect(() => {
        timerRef.current = window.setInterval(() => {
            if (deadlineRef.current === null) return;
            const remainingTime = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
            setState(prev => prev.remainingTime === remainingTime ? prev : { ...prev, remainingTime });
        }, 250);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    // 리다이렉트 카운트다운 처리
    useEffect(() => {
        let redirectTimer: number | null = null;
        if (state.redirectInfo && state.redirectInfo.remainingSeconds > 0) {
            redirectTimer = window.setInterval(() => {
                setState(prev => {
                    if (!prev.redirectInfo) return prev;
                    if (prev.redirectInfo.remainingSeconds <= 1) {
                        // 카운트다운 종료 시 리다이렉트 수행
                        if (socketRef.current) socketRef.current.close();
                        window.location.href = prev.redirectInfo.targetPath;
                        return { ...prev, redirectInfo: { ...prev.redirectInfo, remainingSeconds: 0 } };
                    }
                    return {
                        ...prev,
                        redirectInfo: {
                            ...prev.redirectInfo,
                            remainingSeconds: prev.redirectInfo.remainingSeconds - 1
                        }
                    };
                });
            }, 1000);
        }
        return () => { if (redirectTimer) clearInterval(redirectTimer); };
    }, [state.redirectInfo]);

    const submitVote = (targetUserId: number | null) => sendMessage('SUBMIT_VOTE', { targetUserId });
    const leaveRoom = () => sendMessage('LEAVE_ROOM', { roomId });
    const sendFaceRevealPermission = (accepted: boolean) => sendMessage('FACE_REVEAL_PERMISSION', { accepted });

    // [NEW] 렌더링 완료 상태를 서버에 전달 (자동 동기화 위함)
    const sendRenderComplete = useCallback((stage: string, stageSequence = stageSequenceRef.current) => {
        sendMessage('RENDER_COMPLETE', { stage, stageSequence });
    }, [sendMessage]);

    const submitGameAnswer = useCallback((answer: GameAnswerPayload) => {
        sendMessage('SUBMIT_GAME_VOTE', { ...answer });
    }, [sendMessage]);

    return { state, submitVote, leaveRoom, sendFaceRevealPermission, sendRenderComplete, submitGameAnswer };
};
