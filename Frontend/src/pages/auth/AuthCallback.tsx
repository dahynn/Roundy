import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSignupDetails } from '@/api/auth';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // [변경] 더 이상 URL에서 토큰을 추출하지 않음 (HTTP-Only 쿠키 사용)

    const checkUserStatus = async () => {
      try {
        const userData: any = await getSignupDetails();

        const status = userData.status;
        const hasNickname = !!userData.nickname;

        if (status === 'VALID') {
          console.log('✅ 가입 완료 회원: 홈으로 이동');
          navigate('/home');
        } else if (status === 'BANNED' || status === 'WITHDRAWN') {
          alert('접근이 제한된 계정입니다.');
          navigate('/');
        } else if (status === 'PENDING_VERIFICATION') {
          console.log('ℹ️ 사진 인증 완료: 취향 설문(Step 3)으로 이동');
          navigate('/onboarding', { state: { step: 3 } });
        } else if (status === 'JOINED') {
          if (hasNickname) {
            console.log('ℹ️ 기본 정보 입력 완료: 사진 인증(Step 2)으로 이동');
            navigate('/onboarding', { state: { step: 2 } });
          } else {
            console.log('ℹ️ 정보 미입력: 기본 정보 입력(Step 1)으로 이동');
            navigate('/onboarding', { state: { step: 1 } });
          }
        } else {
          console.log('ℹ️ 기타 상태: 일반 온보딩 시작');
          navigate('/onboarding');
        }
      } catch (error) {
        console.error('❌ 유저 정보 조회 실패 (인증되지 않음):', error);
        navigate('/'); // 실패 시 랜딩 페이지로
      }
    };

    checkUserStatus();
  }, [navigate]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF4D94] mx-auto mb-4"></div>
        <p className="text-gray-500 font-bold">인증 중입니다. 잠시만 기다려주세요...</p>
      </div>
    </div>
  );
}
