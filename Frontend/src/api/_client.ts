import axios from 'axios';

/**
 * 1. Axios 인스턴스 생성
 */
const client = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
    headers: { 'Content-Type': 'application/json' },
});

/**
 * 2. 요청 인터셉터: 토큰 자동 삽입
 */
client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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
            const refreshToken = localStorage.getItem('refreshToken');

            if (refreshToken) {
                try {
                    // 토큰 재발급 요청 (헤더에 refreshToken 포함)
                    const { data } = await axios.post(
                        `${import.meta.env.VITE_API_URL || ''}/api/auth/re-issue`,
                        {},
                        {
                            headers: {
                                Authorization: `Bearer ${refreshToken}`,
                            },
                        }
                    );

                    if (data.success) {
                        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data.data;

                        // 새로운 토큰 저장
                        localStorage.setItem('accessToken', newAccessToken);
                        if (newRefreshToken) {
                            localStorage.setItem('refreshToken', newRefreshToken);
                        }

                        // 헤더 업데이트 후 재요청
                        client.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

                        return client(originalRequest);
                    }
                } catch (refreshError) {
                    console.error('토큰 재발급 실패:', refreshError);
                    // 재발급 실패 시 로그아웃 처리
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/';
                    return Promise.reject(refreshError);
                }
            } else {
                // 리프레시 토큰이 없으면 로그아웃
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    },
);

export default client;
