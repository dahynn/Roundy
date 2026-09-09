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
  it('단체방 복귀는 이전 토큰이 아니라 서버가 새로 발급한 접속 정보를 사용한다', () => {
    const { result, receive } = setup();
    receive({ type: 'JOIN_OK', roomId: 'room-1', token: 'used-lobby-token' });
    receive({ type: 'PAIR_ASSIGNED', partnerId: 2, privateSessionId: 'pair', privateToken: 'pair-token' });
    receive({ type: 'MEDIA_SESSION', stageSequence: 10, sessionId: 'new-lobby', token: 'fresh-token' });
    receive({ type: 'STAGE_CHANGE', stage: 'VOTE_FINAL', stageSequence: 10, durationSeconds: 20 });
    expect(result.current.state.currentPartner?.sessionId).toBe('new-lobby');
    expect(result.current.state.currentPartner?.token).toBe('fresh-token');
    receive({ type: 'MEDIA_SESSION', stageSequence: 9, sessionId: 'old-lobby', token: 'old-token' });
    expect(result.current.state.currentPartner?.token).toBe('fresh-token');
  });

  it('다른 방으로 이동하면 이전 방의 단계 번호와 결과를 초기화한다', () => {
    const { result, rerender } = renderHook(({ id }) => useRotationSystem(id, 'token', null), { initialProps: { id: 'old' } });
    act(() => FakeSocket.instances[0].receive({ type: 'STAGE_CHANGE', stage: 'FACE_REVEAL', stageSequence: 99, durationSeconds: 15 }));
    rerender({ id: 'new' });
    act(() => FakeSocket.instances[1].receive({ type: 'STAGE_CHANGE', stage: 'SELF_INTRO', stageSequence: 1, durationSeconds: 10 }));
    expect(result.current.state.stageSequence).toBe(1);
    expect(result.current.state.currentStage).toBe('SELF_INTRO');
    expect(FakeSocket.instances[0].onmessage).toBeNull();
  });
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

  it('서버의 이미지 게임 계약으로 questionNumber와 SUBMIT_GAME_VOTE를 전송한다', () => {
    const { result, socket, receive } = setup();
    receive({ type: 'GAME_QUESTION', questionNumber: 2, totalQuestions: 3, question: '질문', votingTimeSeconds: 7, candidates: [] });
    expect(result.current.state.currentGame).toMatchObject({ state: 'QUESTION', questionNumber: 2 });
    act(() => result.current.submitGameAnswer({ questionNumber: 2, targetUserId: 8 }));
    expect(JSON.parse(socket.send.mock.calls[0][0])).toEqual({ type: 'SUBMIT_GAME_VOTE', questionNumber: 2, targetUserId: 8 });
  });

  it('매칭 권한이 사라진 입장 오류는 홈으로 안전하게 안내한다', () => {
    const { result, receive } = setup();
    receive({ type: 'ERROR', code: 'ROOM_ACCESS_DENIED', message: '현재 방에 입장할 권한이 없습니다.' });
    expect(result.current.state.connected).toBe(false);
    expect(result.current.state.redirectInfo).toMatchObject({ targetPath: '/home', remainingSeconds: 3 });
  });
});
