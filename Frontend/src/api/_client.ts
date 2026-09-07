import axios, { AxiosError } from 'axios';
import { API_ORIGIN } from '@/config/endpoints';

/**
 * 1. Axios 인스턴스 생성
 */
const client = axios.create({
    baseURL: `${API_ORIGIN}/api`,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true, // 쿠키 전송 활성화
});

// 여러 API가 동시에 401을 받아도 Refresh Token은 한 번만 교환한다.
let refreshPromise: Promise<string> | null = null;
function refreshAccessToken(): Promise<string> {
    refreshPromise ??= axios.post(
        `${API_ORIGIN}/api/auth/re-issue`, {}, { withCredentials: true, timeout: 10000 },
    ).then(({ data }) => {
        if (!data.success || typeof data.data?.accessToken !== 'string') {
            throw new Error('로그인 정보를 갱신하지 못했습니다.');
        }
        const token = data.data.accessToken;
        localStorage.setItem('accessToken', token);
        return token;
    }).finally(() => { refreshPromise = null; });
    return refreshPromise;
}

client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            console.warn('[API] No access token found in localStorage!');
        }
        return config;
    },
    (error) => Promise.reject(error),
);

/**
 * 3. 응답 인터셉터: 데이터 추출 및 에러 제어
 */
client.interceptors.response.use(
    (response) => {
        if (response.data.success) {
            return response.data.data;
        }
        return Promise.reject(new AxiosError(response.data.message || '알 수 없는 에러',
            'ERR_BAD_RESPONSE', response.config, response.request, response));
    },
    async (error) => {
        const originalRequest = error.config;

        // 401 에러이고, 아직 재시도를 하지 않았으며, 재발급 요청 자체가 아닐 때
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry
            && !originalRequest.url?.includes('/auth/re-issue')) {
            originalRequest._retry = true;
            try {
                const currentToken = localStorage.getItem('accessToken');
                const newToken = currentToken && originalRequest.headers.Authorization !== `Bearer ${currentToken}`
                    ? currentToken : await refreshAccessToken();
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return client(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem('accessToken');
                window.location.href = '/';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    },
);

export default client;
