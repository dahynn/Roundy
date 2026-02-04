import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  RotationState,
  WsMessageType,
  JoinOkPayload,
  RoomStatePayload,
  RoundStartPayload,
  RoundEndPayload,
  PairAssignedPayload,
} from '../../types/meeting/rotaion';

interface UserProfile {
  userId: number;
  username: string;
  gender: 'MALE' | 'FEMALE';
  mode: 'FREE_TALK' | 'PAIR_ONLY';
}

interface LobbyCredentials {
  sessionId: string;
  token: string;
}

// RotationMeetingContainer.tsx와 이름을 맞춥니다.
export const useRotation = (roomId: string, userProfile: UserProfile) => {
  const socketRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<number | null>(null);

  const [state, setState] = useState<RotationState & { lobbyCredentials?: LobbyCredentials }>({
    connected: false,
    roomId: null,
    mode: null,
    currentStage: 'WAITING',
    remainingTime: 0,
    currentRound: 0,
    totalRounds: 0,
    participants: [],
    currentPartner: null,
    lastMessage: null,
    lobbyCredentials: undefined,
  });

  const [isReady, setIsReady] = useState(false);

  const sendMessage = useCallback((type: WsMessageType, payload: any = {}) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message = { type, ...payload };
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[WS] Received:', data);

      switch (data.type) {
        case 'JOIN_OK': {
          const payload = data as JoinOkPayload;
          const lobbyInfo = { sessionId: payload.roomId, token: payload.token };
          setState((prev) => ({
            ...prev,
            connected: true,
            roomId: payload.roomId,
            mode: payload.mode,
            lobbyCredentials: lobbyInfo,
            currentRound: payload.roundInfo?.currentRound || 0,
            totalRounds: payload.roundInfo?.totalRounds || 0,
            remainingTime: payload.roundInfo?.durationSeconds || 0,
            currentPartner: {
              id: null,
              nickname: 'Lobby',
              sessionId: lobbyInfo.sessionId,
              token: lobbyInfo.token,
            },
          }));
          break;
        }
        case 'ROOM_STATE': {
          const payload = data as RoomStatePayload;
          setState((prev) => ({
            ...prev,
            participants: payload.participants,
          }));
          break;
        }
        case 'ROUND_START': {
          const payload = data as RoundStartPayload;
          setState((prev) => ({
            ...prev,
            currentStage: 'ROUND_IN_PROGRESS',
            currentRound: payload.roundNumber,
            remainingTime: payload.durationSeconds,
          }));
          break;
        }
        case 'ROUND_END': {
          const payload = data as RoundEndPayload;
          setState((prev) => ({
            ...prev,
            currentStage: 'ROUND_WAITING',
            remainingTime: 0,
          }));
          break;
        }
        case 'PAIR_ASSIGNED': {
          const payload = data as PairAssignedPayload;
          setState((prev) => ({
            ...prev,
            currentPartner: payload.partnerId ? {
              id: payload.partnerId,
              nickname: payload.partnerNickname,
              sessionId: payload.privateSessionId,
              token: payload.privateToken,
            } : null,
          }));
          break;
        }
        // Handle other types if needed
      }
    } catch (err) {
      console.error('[WS] Error:', err);
    }
  }, []);

  useEffect(() => {
    // Spec: ws://localhost:8080/ws/webrtc?userId=1&username=Alice&gender=FEMALE
    const params = new URLSearchParams({
      userId: userProfile.userId.toString(),
      username: userProfile.username,
      gender: userProfile.gender,
      // mode removed from query params as it's not in spec example
    }).toString();

    const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws/webrtc';
    const socket = new WebSocket(`${baseUrl}?${params}`);
    socketRef.current = socket;

    socket.onopen = () => sendMessage('JOIN_ROOM', { roomId });
    socket.onmessage = handleMessage;

    return () => {
      socket.close();
    };
  }, [roomId, userProfile.userId, userProfile.username, userProfile.gender, sendMessage, handleMessage]);

  useEffect(() => {
    if (state.remainingTime > 0) {
      timerRef.current = window.setInterval(() => {
        setState((prev) => ({ ...prev, remainingTime: Math.max(0, prev.remainingTime - 1) }));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.remainingTime]);

  return {
    state,
    isReady,
    handleReady: () => setIsReady(true),
    submitVote: (targetUserId: number) => sendMessage('SUBMIT_VOTE', { targetUserId }),
  };
};
