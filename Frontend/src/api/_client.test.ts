import axios, { AxiosError, AxiosHeaders } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import client from './_client';

const originalAdapter = client.defaults.adapter;
const response = (config: InternalAxiosRequestConfig, data: object, status = 200): AxiosResponse => ({
    config, data, status, statusText: String(status), headers: new AxiosHeaders(),
});

beforeEach(() => { localStorage.setItem('accessToken', 'expired-test-token'); });
afterEach(() => {
    client.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
    localStorage.clear();
});

it('동시 401 응답은 한 번만 토큰을 재발급하고 각 원래 요청을 재시도한다', async () => {
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, data: { accessToken: 'new-test-token' } } });
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        if (config.headers.Authorization !== 'Bearer new-test-token') {
            throw new AxiosError('expired', 'ERR_BAD_REQUEST', config, undefined, response(config, {}, 401));
        }
        return response(config, { success: true, data: { ok: true } });
    });
    client.defaults.adapter = adapter;
    const values = await Promise.all([client.get('/one'), client.get('/two'), client.get('/three')]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledTimes(6);
    expect(values).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
});

it('HTTP 200의 업무 오류도 원래 응답을 보존하여 화면에 이유를 전달한다', async () => {
    client.defaults.adapter = async config => response(config, { success: false, message: '얼굴을 인식할 수 없습니다.' });
    await expect(client.get('/verification/verify')).rejects.toMatchObject({
        message: '얼굴을 인식할 수 없습니다.', response: { data: { success: false } },
    });
});

it('인증 토큰을 콘솔에 기록하지 않는다', async () => {
    const log = vi.spyOn(console, 'log');
    client.defaults.adapter = async config => response(config, { success: true, data: null });
    await client.get('/one');
    expect(JSON.stringify(log.mock.calls)).not.toContain('expired-test-token');
});
