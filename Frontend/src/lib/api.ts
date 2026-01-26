import axios from 'axios';

// 기본 API 설정
export const api = axios.create({
  baseURL: 'https://lab.ssafy.com/api/v1', // 실제 백엔드 주소로 나중에 변경
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// 본인 인증 요청 함수
export const verifyFace = async (representativeImage: File, liveImage: Blob) => {
  const formData = new FormData();
  formData.append('profile_image', representativeImage);
  formData.append('live_image', liveImage, 'live_capture.jpg');

  return await api.post('/users/verify', formData);
};
