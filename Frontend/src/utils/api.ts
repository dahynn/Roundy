import axios from 'axios';

// 1. Axios 인스턴스 생성
const api = axios.create({
  // Vite 환경에서는 import.meta.env를 사용합니다.
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// 2. 요청 인터셉터: 모든 요청 "직전"에 토큰을 자동으로 삽입합니다.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Bearer 뒤에 반드시 공백 한 칸이 있어야 백엔드가 인식합니다.
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 3. 응답 인터셉터: 모든 응답 "직후"에 공통 처리를 수행합니다.
api.interceptors.response.use(
  (response) => {
    // 백엔드 응답 포맷 { success: true, data: { ... } }에서 data만 반환합니다.
    if (response.data.success) {
      return response.data.data;
    }
    // 실패 시 백엔드가 보낸 에러 메시지를 거절(reject)합니다.
    return Promise.reject(response.data.message);
  },
  (error) => {
    // 토큰 만료(401) 등 에러 발생 시 여기서 공통 처리를 할 수 있습니다.
    return Promise.reject(error);
  },
);

export default api;
