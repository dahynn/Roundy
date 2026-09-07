import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enterSession, getSessionStatus, leaveSession } from '@/api/session';

const POLL_INTERVAL_MS = 3000;

export function useSessionQueue(requestId?: string) {
  const navigate = useNavigate();
  const [participantCount, setParticipantCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const cancelRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      navigate('/', { replace: true });
      return;
    }

    let active = true;
    let matched = false;
    let entered = false;
    let inFlight: Promise<void> | undefined;
    let cancellation: Promise<void> | undefined;
    let timer: ReturnType<typeof setTimeout>;

    const cancel = () => {
      active = false;
      clearTimeout(timer);
      // 입장 요청이 끝난 뒤 취소해야 늦은 응답이 사용자를 다시 대기열에 남기지 않는다.
      cancellation ??= (async () => {
        await inFlight;
        if (entered && !matched) await leaveSession();
      })().catch((cause: unknown) => {
        cancellation = undefined; // 취소 실패 시 버튼으로 재시도할 수 있다.
        throw cause;
      });
      return cancellation;
    };
    cancelRef.current = cancel;

    const poll = async () => {
      try {
        entered = true;
        const response = await enterSession(requestId);
        if (!active) return;
        if (!response.success) {
          active = false;
          navigate('/verify', { replace: true });
          return;
        }
        if (response.roomId) {
          matched = true;
          active = false;
          navigate(`/meeting?room=${encodeURIComponent(response.roomId)}`, { replace: true });
          return;
        }

        // queuePosition은 본인 성별의 대기 순번이며 전체 참가 인원이 아니다.
        const status = await getSessionStatus();
        if (!active) return;
        setParticipantCount(Math.min(status.maleCount, 3) + Math.min(status.femaleCount, 3));
        setError(null);
      } catch {
        if (active) setError('서버 연결을 확인하고 있습니다. 잠시 후 다시 시도합니다.');
      }
      if (active) timer = setTimeout(run, POLL_INTERVAL_MS);
    };
    const run = () => { inFlight = poll(); };

    // StrictMode의 첫 정리 단계에서는 요청을 보내지 않고 실제 마운트에서 시작한다.
    timer = setTimeout(run, 0);
    return () => {
      void cancel().catch(() => {
        // 화면을 벗어난 경우에는 상태를 변경하지 않는다.
      });
    };
  }, [navigate, requestId]);

  const cancelQueue = useCallback(async () => {
    setIsLeaving(true);
    setError(null);
    try {
      await cancelRef.current();
      navigate('/home', { replace: true });
    } catch {
      setError('대기열 취소에 실패했습니다. 나가기 버튼을 다시 눌러주세요.');
    } finally {
      setIsLeaving(false);
    }
  }, [navigate]);

  return { participantCount, error, isLeaving, cancelQueue };
}
