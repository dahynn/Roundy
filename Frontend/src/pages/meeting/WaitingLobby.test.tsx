import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { enterSession, getSessionStatus, leaveSession } from '@/api/session';
import type { SessionEnterResponse } from '@/api/session';
import WaitingLobby from './WaitingLobby';

vi.mock('@/api/session', () => ({
  enterSession: vi.fn(), getSessionStatus: vi.fn(), leaveSession: vi.fn(),
}));

const waiting: SessionEnterResponse = {
  success: true, message: '대기 중', queuePosition: 1, roomId: null, gender: null,
};

function renderLobby(search = '') {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[{ pathname: '/loading', search, state: { requestId: 'verified-request' } }]}>
        <Routes>
          <Route path="/loading" element={<WaitingLobby />} />
          <Route path="/meeting" element={<p>미팅 화면</p>} />
          <Route path="/verify" element={<p>본인 인증 화면</p>} />
          <Route path="/home" element={<p>홈 화면</p>} />
          <Route path="/" element={<p>로그인 화면</p>} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.setItem('accessToken', 'test-access-token');
  vi.mocked(enterSession).mockResolvedValue(waiting);
  vi.mocked(getSessionStatus).mockResolvedValue({ maleCount: 1, femaleCount: 1, totalCount: 2, availableSlots: 2 });
  vi.mocked(leaveSession).mockResolvedValue(undefined);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(async () => {
  cleanup();
  await act(async () => {});
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('인증 후 대기열 흐름', () => {
  it('auto 쿼리 없이 진입하고 StrictMode에서도 최초 입장은 한 번만 요청한다', async () => {
    renderLobby();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(enterSession).toHaveBeenCalledExactlyOnceWith('verified-request');
    expect(screen.getByText('2명')).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(enterSession).toHaveBeenCalledTimes(2);
  });

  it('URL의 테스트 토큰으로 로그인 정보를 덮어쓰지 않는다', async () => {
    renderLobby('?user=1&token=untrusted-token&auto=true');
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(localStorage.getItem('accessToken')).toBe('test-access-token');
  });

  it('로그인하지 않은 사용자는 입장 요청을 보내지 않는다', async () => {
    localStorage.clear();
    renderLobby();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(enterSession).not.toHaveBeenCalled();
    expect(screen.getByText('로그인 화면')).toBeTruthy();
  });

  it('매칭되면 미팅으로 이동하고 정상 입장을 취소하지 않는다', async () => {
    vi.mocked(enterSession).mockResolvedValue({ ...waiting, roomId: 'room-1' });
    renderLobby();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText('미팅 화면')).toBeTruthy();
    expect(leaveSession).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(9000));
    expect(enterSession).toHaveBeenCalledTimes(1);
  });

  it('인증이 만료되면 재인증 화면으로 이동한다', async () => {
    vi.mocked(enterSession).mockResolvedValue({ ...waiting, success: false });
    renderLobby();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText('본인 인증 화면')).toBeTruthy();
  });

  it('취소 시 서버 퇴장을 완료한 뒤 홈으로 이동하고 폴링을 멈춘다', async () => {
    renderLobby();
    await act(() => vi.advanceTimersByTimeAsync(0));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '대기열 취소하고 나가기' })));
    expect(leaveSession).toHaveBeenCalledTimes(1);
    expect(screen.getByText('홈 화면')).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(9000));
    expect(enterSession).toHaveBeenCalledTimes(1);
  });

  it('취소 중인 입장 요청이 늦게 끝나도 다시 폴링하지 않는다', async () => {
    let finish!: (value: SessionEnterResponse) => void;
    vi.mocked(enterSession).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    renderLobby();
    await act(() => vi.advanceTimersByTimeAsync(0));
    fireEvent.click(screen.getByRole('button', { name: '대기열 취소하고 나가기' }));
    expect(leaveSession).not.toHaveBeenCalled();
    await act(async () => finish(waiting));
    expect(leaveSession).toHaveBeenCalledTimes(1);
    expect(screen.getByText('홈 화면')).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(9000));
    expect(enterSession).toHaveBeenCalledTimes(1);
  });

  it('일시적인 오류 후 폴링을 재시도한다', async () => {
    vi.mocked(enterSession).mockRejectedValueOnce(new Error('network'));
    renderLobby();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByRole('alert').textContent).toContain('서버 연결');
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(enterSession).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('취소 실패를 표시하고 나가기 버튼으로 재시도할 수 있다', async () => {
    vi.mocked(leaveSession).mockRejectedValueOnce(new Error('network'));
    renderLobby();
    await act(() => vi.advanceTimersByTimeAsync(0));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '대기열 취소하고 나가기' })));
    expect(screen.getByRole('alert').textContent).toContain('취소에 실패');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '대기열 취소하고 나가기' })));
    expect(leaveSession).toHaveBeenCalledTimes(2);
    expect(screen.getByText('홈 화면')).toBeTruthy();
  });
});
