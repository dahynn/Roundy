import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  RotationState,
  WsMessageType,
  JoinOkPayload,
  RoomStatePayload,
  StageChangePayload,
  PairAssignedPayload,
  MatchResultPayload,
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
    currentStage: 'WAITING',
    remainingTime: 0,
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
      switch (data.type) {
        case 'JOIN_OK': {
          const payload = data as JoinOkPayload;
          const lobbyInfo = { sessionId: payload.roomId, token: payload.token };
          setState((prev) => ({
            ...prev,
            connected: true,
            roomId: payload.roomId,
            lobbyCredentials: lobbyInfo,
            currentPartner: {
              id: null,
              nickname: 'Lobby',
              sessionId: lobbyInfo.sessionId,
              token: lobbyInfo.token,
            },
          }));
          break;
        }
        case 'STAGE_CHANGE': {
          const payload = data as StageChangePayload;
          const isPairStage = ['ROTATION_SHORT', 'ROTATION_LONG', 'FACE_REVEAL'].includes(
            payload.stage,
          );
          setState((prev) => ({
            ...prev,
            currentStage: payload.stage,
            remainingTime: payload.durationSeconds,
            currentPartner:
              !isPairStage && prev.lobbyCredentials
                ? {
                    id: null,
                    nickname: 'Lobby',
                    sessionId: prev.lobbyCredentials.sessionId,
                    token: prev.lobbyCredentials.token,
                  }
                : prev.currentPartner,
          }));
          break;
        }
        case 'PAIR_ASSIGNED': {
          const payload = data as PairAssignedPayload;
          setState((prev) => ({
            ...prev,
            currentPartner: {
              id: payload.partnerId,
              nickname: payload.partnerNickname,
              sessionId: payload.privateSessionId,
              token: payload.privateToken,
            },
          }));
          break;
        }
        // ... 나머지 Case 유지
      }
    } catch (err) {
      console.error('[WS] Error:', err);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({
      userId: userProfile.userId.toString(),
      username: userProfile.username,
      gender: userProfile.gender,
      mode: userProfile.mode,
    }).toString();
    const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws/meeting';
    const socket = new WebSocket(`${baseUrl}?${params}`);
    socketRef.current = socket;
    socket.onopen = () => sendMessage('JOIN_ROOM', { roomId });
    socket.onmessage = handleMessage;
    return () => socket.close();
  }, [roomId, userProfile.userId]);

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
    timeLeft: state.remainingTime, // RotationMeetingContainer.tsx 호환용
    currentStage: state.currentStage,
    partner: state.currentPartner,
    isReady,
    handleReady: () => setIsReady(true),
    submitVote: (targetUserId: number) => sendMessage('SUBMIT_VOTE', { targetUserId }),
  };
};
