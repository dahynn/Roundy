import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Moon, Bell, LogOut } from 'lucide-react';

export default function WaitingLobby() {
  const navigate = useNavigate();

  // --- [개발용 테스트 상태] ---
  const [currentParticipants, setCurrentParticipants] = useState(3);
  const totalRequired = 6;
  const progress = Math.floor((currentParticipants / totalRequired) * 100);

  // 10초 단위 폴링 시뮬레이션
  useEffect(() => {
    const timer = setInterval(() => {
      // 3~5명 사이에서 유동적으로 변하게 설정
      const nextCount = Math.floor(Math.random() * 3) + 3;
      setCurrentParticipants(nextCount);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#FDF2F8] flex flex-col font-['Pretendard'] overflow-hidden">
      {/* 1. 상단 헤더 영역 */}
      <header className="w-full px-12 py-6 flex justify-between items-center bg-white/30 backdrop-blur-md">
        {/* 왼쪽 로고 - 클릭 시 랜딩이 아닌 홈으로 이동 */}
        <div
          className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
          onClick={() => navigate('/home')}
        >
          <div className="w-9 h-9 bg-gradient-to-tr from-[#FF4D94] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg">
            <Heart size={20} fill="white" className="text-white" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-[#1A1F36]">Roundy</span>
        </div>

        {/* 오른쪽 상단 버튼 */}
        <div className="flex items-center gap-4 bg-white/80 p-2 px-4 rounded-2xl shadow-sm border border-white/50">
          <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
            <Moon size={22} />
          </button>
          <div className="w-[1px] h-4 bg-gray-200 mx-1" />
          <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 relative">
            <Bell size={22} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#FF4D94] rounded-full border-2 border-white"></span>
          </button>
        </div>
      </header>

      {/* 2. 메인 대기 섹션 */}
      <main className="flex-1 flex items-center justify-center p-6 relative">
        {/* 배경 빛 방울 디자인 */}
        <div className="absolute top-[20%] left-[10%] w-96 h-96 bg-pink-200/30 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-purple-200/20 rounded-full blur-[130px] pointer-events-none"></div>

        <div className="w-full max-w-2xl bg-white/70 backdrop-blur-2xl rounded-[50px] p-16 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] border border-white/80 flex flex-col items-center">
          {/* 하트 로딩 애니메이션 */}
          <div className="relative mb-14">
            <div className="w-28 h-28 border-[3px] border-gray-100 rounded-full"></div>
            <div className="absolute top-0 left-0 w-28 h-28 border-[3px] border-t-[#FF4D94] border-r-[#FF4D94]/30 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Heart size={36} fill="#FF4D94" className="text-[#FF4D94] animate-pulse" />
            </div>
          </div>

          {/* 타이틀 및 서브텍스트 */}
          <h2 className="text-3xl font-black text-[#1A1F36] mb-4 tracking-tight text-center">
            다른 유저들을 기다리고 있어요
          </h2>
          <p className="text-gray-400 text-center font-medium leading-relaxed mb-12 px-6">
            참여자들의 인증이 완료되면 소개팅이 시작되니 <br />
            그전까지 마음에 여유를 가지고 준비해주세요.
          </p>

          {/* 현재 대기 인원 뱃지 */}
          <div className="flex items-center gap-2 bg-[#FFF0F6] text-[#FF4D94] px-6 py-2.5 rounded-full mb-10 shadow-sm border border-pink-100">
            <UsersIcon />
            <span className="text-sm font-bold tracking-tight">
              현재 대기 인원{' '}
              <span className="ml-1 text-lg font-black">
                {currentParticipants} / {totalRequired}
              </span>
            </span>
          </div>

          {/* 게이지바 영역 */}
          <div className="w-full max-w-md px-4">
            <div className="flex justify-between text-[13px] font-bold mb-3">
              <span className="text-gray-400 animate-pulse">매칭 준비 중...</span>
              <span className="text-[#FF4D94]">{progress}%</span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
              <div
                className="h-full bg-gradient-to-r from-[#FF4D94] to-[#7C3AED] transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(255,77,148,0.3)]"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* 3. 대기열 나가기 - 홈 화면으로 리다이렉트 */}
          <button
            onClick={() => {
              if (confirm('대기열에서 나가시겠습니까? 참여 신청이 취소됩니다.')) {
                navigate('/home');
              }
            }}
            className="mt-20 flex items-center gap-1.5 text-gray-300 hover:text-[#FF4D94] font-bold text-xs transition-all tracking-tighter"
          >
            <LogOut size={14} />
            <span>대기열 나가기</span>
          </button>
        </div>
      </main>

      {/* 푸터 카피라이트 */}
      <footer className="py-8 text-center">
        <p className="text-[11px] text-gray-300 font-medium tracking-wide uppercase">
          © 2026 Roundy Premium. Verified Members Only.
        </p>
      </footer>

      {/* 커스텀 애니메이션 */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 2s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
      `}</style>
    </div>
  );
}

// 아이콘 컴포넌트
function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23 21V19C22.9993 18.1137 22.7044 17.2524 22.1614 16.5523C21.6184 15.8522 20.8581 15.3516 20 15.13"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45768C17.623 10.1593 16.8604 10.6597 16 10.88"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
