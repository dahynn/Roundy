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
    FaceRevealStartPayload, // Import FaceRevealStartPayload
    SpeakerChangePayload, // Import SpeakerChangePayload
    GameQuestionPayload, // Import GameQuestionPayload
    GameResultPayload, // Import GameResultPayload
    RotationStage // Import Stage Type
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

    const [state, setState] = useState<RotationState & { lobbyCredentials?: LobbyCredentials }>({
        connected: false,
        roomId: null,
        mode: null,
        currentStage: 'WAITING',
        currentRound: 0,
        totalRounds: 0,
        remainingTime: 0,
        participants: [],
        currentSpeaker: null,
        currentGame: null,
        redirectInfo: null,
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

                        // FACE_REVEAL_START 메시지가 먼저 도착했을 경우 성공 메시지를 유지하기 위함
                        const shouldKeepMessage = payload.stage === 'FACE_REVEAL' && prev.lastMessage?.includes('매칭되었습니다');

                        return {
                            ...prev,
                            currentStage: payload.stage,
                            remainingTime: payload.durationSeconds,
                            currentPartner: nextPartner, // 세션 정보 업데이트 (필요 시 OpenVidu 재접속 유발)
                            currentSpeaker: null, // 스테이지 변경 시 발언자 정보 초기화
                            currentGame: null, // 이미지 게임 정보 초기화
                            lastMessage: shouldKeepMessage ? prev.lastMessage : `스테이지 변경: ${payload.stage}`
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

                case 'GAME_QUESTION': {
                    const payload = data as GameQuestionPayload;
                    setState(prev => ({
                        ...prev,
                        currentGame: {
                            state: 'QUESTION',
                            question: payload.question,
                            questionNumber: payload.questionNumber,
                            totalQuestions: payload.totalQuestions,
                            data: payload
                        },
                        remainingTime: payload.timeLimitSeconds, // 5초 타이머 설정
                        lastMessage: `Q${payload.questionNumber}. ${payload.question}`
                    }));
                    break;
                }

                case 'GAME_RESULT': {
                    const payload = data as GameResultPayload;
                    setState(prev => ({
                        ...prev,
                        currentGame: {
                            state: 'RESULT',
                            question: payload.question,
                            questionNumber: payload.questionNumber,
                            data: payload
                        },
                        // 결과 보여주는 시간 (약 5초) 동안은 remainingTime이 별도로 주어지지 않으므로 0 혹은 유지
                        // 하지만 일반적인 흐름상 다음 문제가 오기 전까지 대기이므로 0으로 처리하거나 유지
                        // 여기서는 명시적으로 0 혹은 UI 제어용으로 둡니다.
                        remainingTime: 0,
                        lastMessage: payload.winners.length > 0
                            ? `정답: ${payload.winners.map(w => w.nickname).join(', ')}`
                            : '결과 발표'
                    }));
                    break;
                }

                case 'VOTE_SUBMITTED':
                    setState(prev => ({ ...prev, lastMessage: '투표 완료!' }));
                    break;

                case 'KICK': {
                    const payload = data as KickPayload;
                    // alert(`강제 퇴장: ${payload.reason}`); // 제거
                    // socketRef.current?.close(); // 리다이렉트 직전에 종료하도록 변경

                    setState(prev => ({
                        ...prev,
                        lastMessage: `퇴장 안내: ${payload.reason}`,
                        redirectInfo: {
                            message: `매칭 실패. ${payload.reason}\n잠시 후 홈으로 이동합니다.`,
                            targetPath: '/',
                            remainingSeconds: 3 // 3초 카운트다운
                        }
                    }));
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

    // WebSocket 연결 (가이드 준수)
    // 1. URL: VITE_WS_URL + ?token={token}
    // 2. JOIN_ROOM: 연결 후 전송
    useEffect(() => {
        // roomId는 연결 URL에 필요 없지만, JOIN_ROOM 메시지에는 필요함
        // 연결 로직은 token이 있을 때만 시도
        if (!token) return;

        // 사용자 요청: ws://localhost:8080/ws/webrtc?token=
        const baseUrl = import.meta.env.VITE_WS_URL;
        if (!baseUrl) {
            console.error('[WS] VITE_WS_URL 환경변수가 설정되지 않았습니다.');
            return;
        }

        const WS_URL = `${baseUrl}?token=${token}`;
        console.log(`[WS] Connecting to ${WS_URL}`);

        const socket = new WebSocket(WS_URL);
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
            console.log('[WS] Disconnected:', event.code, event.reason);
            setState(prev => ({ ...prev, connected: false }));
        };

        socket.onerror = (error) => {
            console.error('[WS] Error:', error);
        };

        return () => {
            console.log('[WS] Closing connection');
            socket.close();
        };
    }, [token, roomId, sendMessage, handleMessage]); // userProfile 의존성 제거

    // 타이머 (기존 게임 타이머)
    useEffect(() => {
        if (state.remainingTime > 0) {
            timerRef.current = window.setInterval(() => {
                setState(prev => ({ ...prev, remainingTime: Math.max(0, prev.remainingTime - 1) }));
            }, 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [state.remainingTime]);

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
    const submitGameAnswer = (answer: string) => sendMessage('SUBMIT_GAME_ANSWER', { answer });
    const leaveRoom = () => sendMessage('LEAVE_ROOM', { roomId });

    return { state, submitVote, submitGameAnswer, leaveRoom };
};