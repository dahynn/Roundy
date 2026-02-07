import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== 'undefined'
  ? import.meta.env.VITE_API_URL
  : '';

// 1. Axios 인스턴스 생성
export const api = axios.create({
  // Vite 환경에서는 import.meta.env를 사용합니다.
  baseURL: `${apiBaseUrl}/api`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // 쿠키 전송 활성화
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
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

/**
 * 유저 정보 조회 API
 */
export const getUserInfo = async (): Promise<any> => {
  return await api.get('/auth/signup/details') as any;
};

/**
 * 로그아웃 API
 */
export const logout = async (): Promise<any> => {
  return await api.post('/auth/logout') as any;
};

/**
 * 회원탈퇴 API
 */
export const withdraw = async (): Promise<any> => {
  return await api.delete('/auth/withdraw') as any;
};

/**
 * 전용 인증 사진 전송 (얼굴 대조용)
 */
export const verifyFace = async (representativeImage: File, liveImage: Blob): Promise<any> => {
  const formData = new FormData();
  formData.append('profile_image', representativeImage);
  formData.append('live_image', liveImage, 'live_capture.jpg');
  return await api.post('/users/verify', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }) as any;
};

/**
 * 세션 목록 조회 (Mock/Test 임시 유지)
 */
export const getSessions = async () => {
  return {
    data: [
      {
        sessionId: 1,
        title: 'ASMR Session',
        description: '조용한 카페에서 속삭이듯 대화하는 기분...',
        currentCount: 3,
        maxCount: 6,
        status: 'RECRUITING',
      },
    ],
  };
};

/**
 * 세션 입장 (Mock/Test 임시 유지)
 */
export const joinSession = async (sessionId: number) => {
  return { data: { success: true } };
};

export default api;
