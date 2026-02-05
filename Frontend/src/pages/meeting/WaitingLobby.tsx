import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Bell, LogOut, Sparkles, Loader2 } from 'lucide-react';
import { enterSession } from '@/api/session';
import type { SessionEnterResponse } from '@/api/session';

// ------------------------------------------------------------------
// [TEST CONFIG]
// ------------------------------------------------------------------
const TEST_TOKENS = [
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwicm9sZSI6IlVTRVIiLCJpYXQiOjE3NzAyNTU5MjUsImV4cCI6MTc3MDQyODcyNX0.Vb38pTtoqaBT54PQfeWk_qKJVLiwjqvsX3vCK30veZI",
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIyIiwicm9sZSI6IlVTRVIiLCJpYXQiOjE3NzAyNTU5MzgsImV4cCI6MTc3MDQyODczOH0.LrEW-B7wlz0cWuskTCqTVFgpSRR1OmbKCu4lg6M30A4",
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzIiwicm9sZSI6IlVTRVIiLCJpYXQiOjE3NzAyNTU5NTAsImV4cCI6MTc3MDQyODc1MH0.65KkNu2oTMCH6Df345_Xyq-dVZmRvluBU1I7me677ig",
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0Iiwicm9sZSI6IlVTRVIiLCJpYXQiOjE3NzAyNTU5NjIsImV4cCI6MTc3MDQyODc2Mn0.PnVyVyou5c3RnxD-Z3unRZm1nFSgnRKQfBZr3u8Vc4",
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI1Iiwicm9sZSI6IlVTRVIiLCJpYXQiOjE3NzAyNTU5NzQsImV4cCI6MTc3MDQyODc3NH0.xkBiR5IPpC2mpPmYSfgMm9dR2VIVEQ75jR7OijUiyFI",
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2Iiwicm9sZCI6IlVTRVIiLCJpYXQiOjE3NzAyNTU5ODUsImV4cCI6MTc3MDQyODc4NX0.ZA0C5P5MeCld1YwKhwcBybsdcHPXbxUWeq5NWhbngOI"
];

const LOADING_MESSAGES = [
  "매력적인 참가자를 찾는 중...",
  "검증된 회원님들을 모시고 있어요.",
  "두근거리는 만남을 준비 중...",
  "거의 다 되었습니다!",
  "오늘의 인연은 어디에 있을까요?",
  "설레는 첫 마디를 고민하고 있어요...",
  "운명적인 만남이 다가오고 있습니다!",
];

export default function WaitingLobby() {
  const navigate = useNavigate();

  // --- [상태 관리] ---
  const [currentParticipants, setCurrentParticipants] = useState(0);
  const [totalRequired] = useState(6);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  // --- [테스트용] 쿼리 파라미터 ---
  const [searchParams] = useSearchParams();
  const progress = totalRequired > 0
    ? Math.min(100, Math.floor((currentParticipants / totalRequired) * 100))
    : 0;

  // 로딩 메시지 롤링 효과
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const queryUser = searchParams.get('user');
    const queryToken = searchParams.get('token');
    let tokenToSet = '';

    if (queryUser) {
      const idx = parseInt(queryUser, 10);
      if (TEST_TOKENS[idx]) tokenToSet = TEST_TOKENS[idx];
    } else if (queryToken) {
      tokenToSet = queryToken;
    }

    if (tokenToSet) {
      localStorage.setItem('accessToken', tokenToSet);
    }
  }, [searchParams]);

  // --- 매칭 로직 ---
  const [isMatching, setIsMatching] = useState(true);

  useEffect(() => {
    if (!isMatching) return;

    let isMounted = true;
    let timer: number | null = null;
    let retryCount = 0;

    const pollMatch = async () => {
      if (!isMounted) return;
      try {
        const response = await enterSession() as unknown as SessionEnterResponse;

        if (response.roomId) {
          const token = localStorage.getItem('accessToken');
          if (token) {
            window.location.href = `/meeting?room=${response.roomId}&token=${token}`;
            return;
          } else {
            alert("인증 토큰이 만료되었습니다.");
            navigate('/home');
          }
        }

        if (response.queuePosition !== undefined && response.queuePosition !== null) {
          const estimatedFilled = Math.max(0, 6 - response.queuePosition);
          setCurrentParticipants(estimatedFilled);
        }
        timer = window.setTimeout(pollMatch, 3000);
        retryCount++;

      } catch (error) {
        timer = window.setTimeout(pollMatch, 3000);
        retryCount++;
      }
    };

    pollMatch();
    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [isMatching, navigate]);


  return (
    <div className="min-h-screen relative flex flex-col font-['Pretendard'] overflow-hidden bg-[#F8FAFC]">

      {/* 🌌 배경: 오로라 그라디언트 애니메이션 */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-r from-pink-300/30 to-purple-300/30 blur-[120px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-r from-blue-200/30 to-indigo-200/30 blur-[120px] animate-blob animation-delay-2000"></div>
        <div className="absolute top-[40%] left-[40%] w-[40%] h-[40%] rounded-full bg-gradient-to-r from-rose-100/40 to-orange-100/40 blur-[100px] animate-blob animation-delay-4000"></div>
      </div>

      <header className="relative z-10 w-full px-8 py-6 flex justify-between items-center">
        <div
          className="group flex items-center gap-2.5 cursor-pointer"
          onClick={() => navigate('/home')}
        >
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#FF4D94] to-[#7C3AED] rounded-xl shadow-lg opacity-90 group-hover:scale-110 transition-transform duration-300"></div>
            <Heart size={20} fill="white" className="text-white relative z-10" />
          </div>
          <span className="text-2xl font-black tracking-tight text-[#1A1F36] group-hover:text-[#FF4D94] transition-colors">Roundy</span>
        </div>

        <button className="relative p-2.5 rounded-full bg-white/50 border border-white/60 hover:bg-white transition-all shadow-sm hover:shadow-md backdrop-blur-sm">
          <Bell size={20} className="text-gray-500" />
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-[#FF4D94] rounded-full ring-2 ring-white"></span>
        </button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">

        <div className="w-full max-w-xl relative">

          <div className="relative bg-white/60 dark:bg-black/20 backdrop-blur-2xl rounded-[52px] p-12 md:p-16 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.08)] border border-white/80 ring-1 ring-white/50 flex flex-col items-center">

            <div className="flex justify-center mb-16 relative">
              <div className="absolute inset-0 bg-[#FF4D94]/20 rounded-full animate-ping-slow"></div>
              <div className="absolute inset-0 bg-[#FF4D94]/10 rounded-full animate-ping-slower"></div>

              <div className="relative w-32 h-32 bg-gradient-to-br from-white to-pink-50/80 rounded-full shadow-[0_16px_32px_-8px_rgba(255,77,148,0.3)] flex items-center justify-center border-[3px] border-white/80 backdrop-blur-md">
                <Heart size={48} fill="#FF4D94" className="text-[#FF4D94] drop-shadow-xl animate-heartbeat" />
              </div>

              <Sparkles size={24} className="absolute -top-3 -right-3 text-yellow-400/80 animate-bounce" fill="currentColor" />
            </div>

            <div className="text-center mb-14 w-full">
              <h2 className="text-[28px] pb-2 md:text-3xl font-extrabold text-[#1A1F36] mb-5 tracking-tight leading-tight">
                설레는 만남을 준비 중이에요
              </h2>
              <div className="h-7 overflow-hidden relative w-full flex justify-center">
                <p key={loadingMsgIndex} className="text-gray-500 font-medium text-[16px] animate-fade-in-up absolute">
                  {LOADING_MESSAGES[loadingMsgIndex]}
                </p>
              </div>
            </div>

            <div className="mb-14 w-full">
              <div className="flex justify-between items-end mb-5 px-1">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-pink-50 rounded-full">
                    <Loader2 size={14} className="text-[#FF4D94] animate-spin" />
                  </div>
                  <span className="text-sm font-bold text-gray-600 uppercase tracking-wider">Matching...</span>
                </div>
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D94] to-[#7C3AED] leading-none">
                  {progress}%
                </span>
              </div>

              <div className="h-[14px] w-full bg-gray-100/80 rounded-full overflow-hidden p-[3px] shadow-inner">
                <div className="h-full w-full bg-white rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#FF4D94] to-[#7C3AED] rounded-full transition-all duration-1000 ease-out relative shadow-[2px_0_8px_rgba(255,77,148,0.4)]"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute top-0 right-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-white/40 to-white/10 skew-x-12 opacity-60"></div>
                  </div>
                </div>
              </div>
              <p className="text-center text-sm text-gray-400 mt-5 font-medium">
                현재 <strong className="text-gray-800">{currentParticipants}명</strong>이 입장했습니다 (최소 {totalRequired}명 필요)
              </p>
            </div>

            <button
              onClick={() => {
                if (confirm('대기열에서 나가시겠습니까? 참여 신청이 취소됩니다.')) navigate('/home');
              }}
              className="w-full py-4 rounded-2xl text-gray-400 hover:text-[#FF4D94] hover:bg-pink-50/50 transition-all flex items-center justify-center gap-2 text-sm font-bold tracking-wide group/btn border border-transparent hover:border-pink-100"
            >
              <LogOut size={16} className="group-hover/btn:-translate-x-0.5 transition-transform opacity-70 group-hover:opacity-100" />
              대기열 취소하고 나가기
            </button>

          </div>
        </div>
      </main>

      <footer className="relative z-10 py-8 text-center">
        <p className="text-[11px] text-gray-400 font-medium tracking-widest uppercase opacity-60">
          Secure Connection • Verfied Session
        </p>
      </footer>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); filter: brightness(1.1); }
        }
        /* 파동 애니메이션 크기 조정 (이전 값으로 롤백) */
        @keyframes ping-slow {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes ping-slower {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .animate-heartbeat { animation: heartbeat 2s ease-in-out infinite; }
        .animate-ping-slow { animation: ping-slow 2.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .animate-ping-slower { animation: ping-slower 3.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .animate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }
      `}</style>
    </div>
  );
}