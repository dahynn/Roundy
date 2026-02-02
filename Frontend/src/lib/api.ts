import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 인터셉터: 토큰 삽입
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.method?.toLowerCase() === 'get') {
    delete config.data;
  }

  return config;
});

/**
 * 유저 정보 조회 API
 */
export const getUserInfo = async () => {
  const response = await api.get('/auth/signup/details');
  return response.data;
};

/**
 * [추가] 로그아웃 API
 * Method: POST
 * URL: /auth/logout
 */
export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

/**
 * [추가] 회원탈퇴 API
 * Method: DELETE
 * URL: /auth/withdraw
 */
export const withdraw = async () => {
  const response = await api.delete('/auth/withdraw');
  return response.data;
};

// 기존 함수들 유지
export const verifyFace = async (representativeImage: File, liveImage: Blob) => {
  const formData = new FormData();
  formData.append('profile_image', representativeImage);
  formData.append('live_image', liveImage, 'live_capture.jpg');
  return await api.post('/users/verify', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

