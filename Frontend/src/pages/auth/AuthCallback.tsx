import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token'); // 쿼리 파라미터에서 토큰 추출

    if (token) {
      // 1. 브라우저 로컬 스토리지에 토큰 저장
      localStorage.setItem('accessToken', token);

      // 2. 다음 단계인 온보딩으로 이동
      navigate('/onboarding');
    } else {
      console.error('토큰을 찾을 수 없습니다.');
      navigate('/'); // 실패 시 랜딩 페이지로
    }
  }, [searchParams, navigate]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF4D94] mx-auto mb-4"></div>
        <p className="text-gray-500 font-bold">인증 중입니다. 잠시만 기다려주세요...</p>
      </div>
    </div>
  );
}
