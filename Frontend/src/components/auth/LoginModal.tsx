import { X, Heart } from 'lucide-react';
import kakaoLoginBtn from '@/assets/kakao_login_medium_wide.png';

interface Props {
  onClose: () => void;
}

export default function LoginModal({ onClose }: Props) {
  // 카카오 로그인 핸들러: 백엔드 인증 서버로 리다이렉트
  const handleKakaoLogin = () => {
    // 백엔드 명세에 정의된 로그인 엔드포인트로 이동합니다.
    // 이동 후 카카오 로그인이 완료되면 자동으로 프론트엔드 콜백 URL로 돌아옵니다.
    window.location.href = 'http://localhost:8080/api/auth/login';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      {/* 배경 블러 처리 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />

      {/* 모달 본체 */}
      <div className="relative w-full max-w-lg bg-white rounded-[50px] shadow-2xl overflow-hidden flex flex-col items-center p-16 animate-in fade-in zoom-in duration-300 border border-white/20">
        {/* 상단 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-10 right-10 text-gray-300 hover:text-gray-500 transition-colors"
        >
          <X size={28} />
        </button>

        {/* 1. 로고 */}
        <div className="w-24 h-24 bg-gradient-to-tr from-[#FF4D94] to-[#7C3AED] rounded-[30px] flex items-center justify-center mb-10 shadow-xl shadow-pink-100/50">
          <Heart size={48} fill="white" className="text-white" />
        </div>

        {/* 2. 헤더 메시지 */}
        <div className="text-center mb-14">
          <h2 className="text-3xl font-black text-[#1A1F36] mb-4 tracking-tight">
            라운디에 오신 것을 환영합니다!
          </h2>
          <p className="text-gray-400 font-medium text-lg">지금 바로 설레는 대화를 시작해보세요.</p>
        </div>

        {/* 3. 카카오 공식 로그인 버튼 */}
        <div className="w-full max-w-sm">
          <button
            className="w-full transition-transform hover:scale-[1.02] active:scale-95 mb-14 rounded-2xl overflow-hidden shadow-sm"
            onClick={handleKakaoLogin}
          >
            <img
              src={kakaoLoginBtn}
              alt="카카오로 시작하기"
              className="w-full h-auto cursor-pointer object-contain"
            />
          </button>
        </div>

        {/* 하단 링크 및 푸터 */}
        <div className="flex gap-6 text-sm font-bold text-gray-300 mb-10">
          <span className="hover:text-gray-500 cursor-pointer">이용약관</span>
          <span className="text-gray-100">|</span>
          <span className="hover:text-gray-500 cursor-pointer">개인정보처리방침</span>
          <span className="text-gray-200">|</span>
          <span className="hover:text-gray-500 cursor-pointer">문의하기</span>
        </div>

        <p className="text-xs text-gray-200 font-medium tracking-widest uppercase">
          © 2026 Roundy. Premium Dating Experience.
        </p>
      </div>
    </div>
  );
}
