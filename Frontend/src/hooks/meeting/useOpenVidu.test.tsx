import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOpenVidu } from './useOpenVidu';

const sdk = vi.hoisted(() => ({ initSession: vi.fn(), initPublisherAsync: vi.fn() }));
vi.mock('openvidu-browser', () => ({ OpenVidu: class {
    enableProdMode() {}
    initSession = sdk.initSession;
    initPublisherAsync = sdk.initPublisherAsync;
} }));

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(r => { resolve = r; });
    return { promise, resolve };
}
function track() {
    const owned = { readyState: 'live', stop: vi.fn() };
    const original = { readyState: 'live', clone: vi.fn(() => owned), stop: vi.fn() };
    return { owned, original, input: original as unknown as MediaStreamTrack };
}
function publisher(video: unknown) {
    return { stream: { getMediaStream: () => ({ getTracks: () => [video], getVideoTracks: () => [video] }) } };
}
function session() {
    const listeners: Record<string, (event: unknown) => void> = {};
    return {
        connect: vi.fn().mockResolvedValue(undefined), publish: vi.fn().mockResolvedValue(undefined),
        unpublish: vi.fn(), disconnect: vi.fn(), subscribe: vi.fn(),
        on: vi.fn((name: string, listener: (event: unknown) => void) => { listeners[name] = listener; }),
        emit: (name: string, event: unknown) => listeners[name]?.(event),
    };
}
beforeEach(() => {
    vi.clearAllMocks();
    sdk.initSession.mockImplementation(session);
    sdk.initPublisherAsync.mockImplementation(async (_target, options) => publisher(options.videoSource));
});
afterEach(cleanup);

describe('화상 세션 수명과 중복 요청', () => {
    it('같은 방의 연결 중 재렌더링은 connect와 publish를 한 번만 실행한다', async () => {
        const video = track();
        const pending = deferred<void>();
        const room = session();
        room.connect.mockReturnValue(pending.promise);
        sdk.initSession.mockReturnValue(room);
        const { result } = renderHook(useOpenVidu);
        let first!: Promise<void>, second!: Promise<void>;
        act(() => {
            first = result.current.joinSession('room', 'one-use-token', 'name', video.input);
            second = result.current.joinSession('room', 'one-use-token', 'name', video.input);
        });
        await act(async () => { pending.resolve(); await Promise.all([first, second]); });
        expect(room.connect).toHaveBeenCalledTimes(1);
        expect(room.publish).toHaveBeenCalledTimes(1);
        expect(sdk.initPublisherAsync).toHaveBeenCalledTimes(1);
    });

    it('이전 방의 연결이 늦게 끝나거나 종료 이벤트가 와도 새 방을 덮어쓰지 않는다', async () => {
        const pending = deferred<void>();
        const previous = session(), next = session();
        previous.connect.mockReturnValue(pending.promise);
        sdk.initSession.mockReturnValueOnce(previous).mockReturnValueOnce(next);
        const { result } = renderHook(useOpenVidu);
        let oldJoin!: Promise<void>;
        act(() => { oldJoin = result.current.joinSession('old', 'old-token', 'name'); });
        await act(() => result.current.joinSession('new', 'new-token', 'name'));
        await act(async () => { pending.resolve(); await oldJoin; });
        act(() => previous.emit('sessionDisconnected', { reason: 'networkDisconnect' }));
        expect(result.current.session).toBe(next);
        expect(next.disconnect).not.toHaveBeenCalled();
        expect(previous.disconnect).toHaveBeenCalled();
    });

    it('연결 도중 나가면 늦게 성공한 연결은 해제하고 카메라를 만들지 않는다', async () => {
        const pending = deferred<void>(), room = session();
        room.connect.mockReturnValue(pending.promise);
        sdk.initSession.mockReturnValue(room);
        const { result } = renderHook(useOpenVidu);
        let joining!: Promise<void>;
        act(() => { joining = result.current.joinSession('room', 'token', 'name', track().input); });
        act(() => result.current.leaveSession());
        await act(async () => { pending.resolve(); await joining; });
        expect(result.current.session).toBeUndefined();
        expect(sdk.initPublisherAsync).not.toHaveBeenCalled();
    });

    it('언마운트 후 카메라 초기화가 완료되면 복제 트랙만 종료한다', async () => {
        const video = track(), pending = deferred<ReturnType<typeof publisher>>();
        sdk.initPublisherAsync.mockReturnValueOnce(pending.promise);
        const { result, unmount } = renderHook(useOpenVidu);
        let initializing!: Promise<unknown>;
        act(() => { initializing = result.current.initSelfCamera(video.input); });
        unmount();
        await act(async () => { pending.resolve(publisher(video.owned)); await initializing; });
        expect(video.owned.stop).toHaveBeenCalled();
        expect(video.original.stop).not.toHaveBeenCalled();
    });

    it('다음 방에서는 Publisher를 새로 만들고 한 번만 송출하며 원본 마스킹 트랙은 보존한다', async () => {
        const video = track(), first = session(), second = session();
        sdk.initSession.mockReturnValueOnce(first).mockReturnValueOnce(second);
        const { result } = renderHook(useOpenVidu);
        await act(() => result.current.joinSession('one', 'token1', 'name', video.input));
        await act(() => result.current.joinSession('two', 'token2', 'name', video.input));
        expect(first.publish).toHaveBeenCalledTimes(1);
        expect(second.publish).toHaveBeenCalledTimes(1);
        expect(sdk.initPublisherAsync).toHaveBeenCalledTimes(2);
        expect(video.original.stop).not.toHaveBeenCalled();
    });

    it('같은 방에서 마스킹 트랙이 바뀌면 이전 송출을 해제하고 교체한다', async () => {
        const first = track(), second = track(), room = session();
        sdk.initSession.mockReturnValue(room);
        const { result } = renderHook(useOpenVidu);
        await act(() => result.current.joinSession('one', 'token1', 'name', first.input));
        await act(() => result.current.initSelfCamera(second.input));
        expect(room.unpublish).toHaveBeenCalledTimes(1);
        expect(room.publish).toHaveBeenCalledTimes(2);
        expect(first.owned.stop).toHaveBeenCalled();
        expect(first.original.stop).not.toHaveBeenCalled();
    });

    it('카메라 초기화 실패를 화면에서 표시할 수 있도록 반환한다', async () => {
        sdk.initPublisherAsync.mockRejectedValueOnce(new Error('permission denied'));
        const { result } = renderHook(useOpenVidu);
        await act(() => result.current.initSelfCamera(track().input));
        expect(result.current.error).toContain('권한');
    });
});
