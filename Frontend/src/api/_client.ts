import axios from 'axios';

/**
 * 1. Axios 인스턴스 생성
 */
const client = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api`,
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
    (error) => {
        // 401 Unauthorized 시 로컬 스토리지 정리 등 공통 처리 가능
        return Promise.reject(error);
    },
);

export default client;
