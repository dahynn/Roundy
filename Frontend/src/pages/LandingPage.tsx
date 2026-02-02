import React, { useState, useEffect } from 'react';
import { Heart, ChevronRight, Zap, Sparkles, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LoginModal from '@/components/auth/LoginModal';

// 숫자 카운팅 훅 (동일)
const useCountUp = (end: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);
  return count;
};

export default function LandingPage() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const matchingCount = useCountUp(2400);
  const minuteCount = useCountUp(15);
  const satisfactionCount = useCountUp(98);

  return (
    <div className="min-h-screen bg-[#FDF2F8] font-['Pretendard'] flex flex-col relative overflow-x-hidden">
      {/* 배경 그라데이션 유닛 (동일) */}
      <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-pink-200/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[-5%] w-[500px] h-[500px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* 1. 상단 로고 영역 (Top) */}
      <header className="w-full px-12 py-10 z-20">
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="w-10 h-10 bg-gradient-to-tr from-[#FF4D94] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-md">
            <Heart size={22} fill="white" className="text-white" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-2xl font-black tracking-tighter text-[#1A1F36] leading-none">
              Roundy
            </span>
            <span className="text-[10px] font-bold text-[#FF4D94] tracking-widest uppercase mt-1">
              Premium Rotation
            </span>
          </div>
        </div>
      </header>

      {/* 2. 메인 히어로 & 지표 섹션 (Center ~ Bottom)
          여기서 justify-between을 써서 간격을 벌립니다. */}
      <main className="flex-1 flex flex-col justify-between items-center text-center px-6 z-10 pt-10 pb-20">
        {/* 상단 메시지 그룹 */}
        <div className="flex flex-col items-center">
          <div className="inline-block bg-white/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/50 mb-10 shadow-sm">
            <span className="text-[11px] font-black text-[#FF4D94] tracking-[0.2em] uppercase">
              ● Premium Online Experience
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-[#1A1F36] mb-8 tracking-tight leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D94] to-[#7C3AED]">
              온라인 로테이션 소개팅, 라운디
            </span>
          </h1>

          <br />
          <div className="mb-12">
            <p className="text-xl md:text-2xl font-bold text-[#4E5968] mb-3">
              무료로 즐기는 '극한의 고효율 소개팅'
            </p>
            <p className="text-lg md:text-xl font-medium text-gray-400">
              시간 낭비 없는 설레임, 검증된 인연을 누구보다 빠르게 만나보세요.
            </p>
          </div>

          <Button
            onClick={() => setIsLoginModalOpen(true)}
            className="bg-gradient-to-r from-[#FF4D94] to-[#7C3AED] hover:opacity-90 text-white px-30 py-9 min-w-[380px] rounded-full text-2xl font-bold shadow-2xl transition-all hover:scale-[1.05] active:scale-95 flex items-center gap-6"
          >
            미팅 시작하기 <ChevronRight size={26} />
          </Button>
        </div>

        {/* 하단 지표 카드 그룹 (지면 하단에 가깝게 배치) */}
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-10 mt-20">
          <StatCard
            icon={<Zap className="text-[#FF4D94]" size={32} />}
            label="누적 매칭"
            value={`${matchingCount.toLocaleString()}+`}
          />
          <StatCard
            icon={<Sparkles className="text-[#FF4D94]" size={32} />}
            label="평균 대화"
            value={`${minuteCount}min`}
          />
          <StatCard
            icon={<ThumbsUp className="text-[#FF4D94]" size={32} />}
            label="유저 만족도"
            value={`${satisfactionCount}%`}
            highlight
          />
        </div>
      </main>

      <footer className="py-10 text-center text-[11px] text-gray-400 font-bold tracking-tight">
        © 2026 Roundy. Premium Dating Experience.
      </footer>

      {isLoginModalOpen && <LoginModal onClose={() => setIsLoginModalOpen(false)} />}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-white/90 backdrop-blur-xl p-12 rounded-[50px] border border-white flex flex-col items-center shadow-[0_10px_30px_rgba(0,0,0,0.03)] transition-transform hover:-translate-y-3 duration-300">
      <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center mb-8">
        {icon}
      </div>
      <span
        className={`text-6xl font-black mb-4 tracking-tighter ${highlight ? 'text-[#FF4D94]' : 'text-[#1A1F36]'}`}
      >
        {value}
      </span>
      <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">{label}</span>
    </div>
  );
}
