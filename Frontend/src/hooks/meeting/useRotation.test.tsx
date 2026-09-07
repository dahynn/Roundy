import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRotationSystem } from './useRotation';

class FakeSocket {
  static OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((message: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  url: string;
  constructor(url: string) { this.url = url; FakeSocket.instances.push(this); }
  receive(data: object) { this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent); }
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeSocket);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function setup() {
  const hook = renderHook(() => useRotationSystem('room-1', 'test-token', null));
  const socket = FakeSocket.instances[0];
  const receive = (data: object) => act(() => socket.receive(data));
  return { ...hook, socket, receive };
}

describe('서버 단계와 타이머 동기화', () => {
  it('단계 화면만 바뀌었을 때는 시간이 줄지 않고 START_TIMER 이후부터 줄어든다', async () => {
    const { result, receive } = setup();
    receive({ type: 'STAGE_CHANGE', stage: 'VOTE_FIRST', stageSequence: 1, durationSeconds: 10 });
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(result.current.state.remainingTime).toBe(10);
    receive({ type: 'START_TIMER', stageSequence: 1, totalSeconds: 10 });
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(result.current.state.remainingTime).toBe(8);
  });

  it('중복 START_TIMER와 이전 단계의 START_TIMER를 무시한다', async () => {
    const { result, receive } = setup();
    receive({ type: 'STAGE_CHANGE', stage: 'SELF_INTRO', stageSequence: 1, durationSeconds: 10 });
    receive({ type: 'START_TIMER', stageSequence: 1, totalSeconds: 10 });
    await act(() => vi.advanceTimersByTimeAsync(2000));
    receive({ type: 'START_TIMER', stageSequence: 1, totalSeconds: 10 });
    expect(result.current.state.remainingTime).toBe(8);
    receive({ type: 'STAGE_CHANGE', stage: 'SELF_INTRO', stageSequence: 2, durationSeconds: 10 });
    receive({ type: 'START_TIMER', stageSequence: 1, totalSeconds: 50 });
    expect(result.current.state.stageSequence).toBe(2);
    expect(result.current.state.remainingTime).toBe(10);
  });

  it('휴식도 별도 단계로 처리하고 이전 단계의 타이머를 멈춘다', async () => {
    const { result, receive } = setup();
    receive({ type: 'STAGE_CHANGE', stage: 'VOTE_FIRST', stageSequence: 1, durationSeconds: 10 });
    receive({ type: 'START_TIMER', stageSequence: 1, totalSeconds: 10 });
    receive({ type: 'BREAK', stageSequence: 2, durationSeconds: 10 });
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(result.current.state.currentStage).toBe('BREAK');
    expect(result.current.state.remainingTime).toBe(10);
    receive({ type: 'START_TIMER', stageSequence: 2, totalSeconds: 10 });
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(result.current.state.remainingTime).toBe(9);
  });

  it('탭 타이머가 지연되어도 경과 시간만큼 보정한다', () => {
    const { result, receive } = setup();
    receive({ type: 'STAGE_CHANGE', stage: 'ROTATION_LONG', stageSequence: 1, durationSeconds: 30 });
    receive({ type: 'START_TIMER', stageSequence: 1, totalSeconds: 30 });
    vi.setSystemTime(Date.now() + 12000);
    act(() => vi.advanceTimersByTime(250));
    expect(result.current.state.remainingTime).toBe(18);
  });

  it('반복 자기소개 단계의 준비 신호에 현재 전환 번호를 포함한다', () => {
    const { result, socket, receive } = setup();
    receive({ type: 'STAGE_CHANGE', stage: 'SELF_INTRO', stageSequence: 2, durationSeconds: 10 });
    act(() => result.current.sendRenderComplete('SELF_INTRO'));
    expect(JSON.parse(socket.send.mock.calls[0][0])).toEqual({ type: 'RENDER_COMPLETE', stage: 'SELF_INTRO', stageSequence: 2 });
  });

  it('다음 단계가 시작되면 첫인상 투표 결과를 지운다', () => {
    const { result, receive } = setup();
    receive({ type: 'BREAK', stageSequence: 1, durationSeconds: 10 });
    receive({ type: 'FIRST_VOTE_RESULT', results: [] });
    receive({ type: 'STAGE_CHANGE', stage: 'ROTATION_SHORT', stageSequence: 2, durationSeconds: 20 });
    expect(result.current.state.firstVoteResults).toBeNull();
  });
});
