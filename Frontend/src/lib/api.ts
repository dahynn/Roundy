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

// 세션 리스트 조회 (Mock 데이터)
export const getSessions = async () => {
  // 실제 API 연동 시: return await api.get('/sessions');
  // 현재는 디자인 확인용 가짜 데이터 반환
  return {
    data: [
      {
        sessionId: 1,
        title: 'ASMR Session',
        description:
          '시끄러운 술집이 아닌, 조용한 카페에서 속삭이듯 대화하는 기분. 서로의 목소리에 집중하는 차분하고 진실된 시간을 가져보세요.',
        currentCount: 3,
        maxCount: 6,
        status: 'RECRUITING',
      },
    ],
  };
};

// 세션 참가 신청
export const joinSession = async (sessionId: number) => {
  // 실제 API: return await api.post(`/sessions/${sessionId}/participants`);
  return { data: { success: true } };
};
