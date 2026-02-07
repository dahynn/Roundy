import axios from 'axios';

/**
 * 1. Axios 인스턴스 생성
 */
const apiBaseUrl = import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== 'undefined'
    ? import.meta.env.VITE_API_URL
    : '';

const client = axios.create({
    baseURL: `${apiBaseUrl}/api`,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true, // 쿠키 전송 활성화
});

client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        console.log('[API] Request Interceptor - Token:', token ? token.substring(0, 20) + '...' : 'NULL');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('[API] Header set:', config.headers.Authorization);
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
        return Promise.reject(response.data.message || '알 수 없는 에러');
    },
    async (error) => {
        const originalRequest = error.config;

        // 401 에러이고, 아직 재시도를 하지 않았으며, 재발급 요청 자체가 아닐 때
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/re-issue')) {
            originalRequest._retry = true;
            if (true) { // Refresh Token도 쿠키로 관리되므로 일단 시도
                try {
                    // 토큰 재발급 요청 (쿠키에 담겨서 전송됨)
                    const { data } = await axios.post(
                        `${apiBaseUrl}/api/auth/re-issue`,
                        {},
                        { withCredentials: true }
                    );

                    if (data.success) {
                        // 성공 시 새로운 Access Token을 localStorage에 저장
                        const newToken = data.data.accessToken;
                        localStorage.setItem('accessToken', newToken);

                        // 기존 요청 헤더 업데이트 및 재시도
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return client(originalRequest);
                    }
                } catch (refreshError) {
                    console.error('토큰 재발급 실패:', refreshError);
                    localStorage.removeItem('accessToken');
                    window.location.href = '/';
                    return Promise.reject(refreshError);
                }
            }
        }
        return Promise.reject(error);
    },
);

export default client;
