import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import SessionCard from '@/components/home/SessionCard';

export default function HomePage() {
  const navigate = useNavigate();
  const userGender = 'MALE';
  const [sessionData] = useState({
    maleCount: 1,
    femaleCount: 1,
    maxPerGender: 3,
  });

  const handleJoinClick = () => navigate('/verify');

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-pink-100/30 rounded-full blur-[120px] pointer-events-none opacity-60" />

        {/* 우측 화면 정중앙에 꽉 차게 배치 */}
        <div className="z-10 w-full max-w-[1400px] flex justify-center items-center transition-all">
          <SessionCard
            userGender={userGender}
            maleCount={sessionData.maleCount}
            femaleCount={sessionData.femaleCount}
            maxPerGender={sessionData.maxPerGender}
            onJoin={handleJoinClick}
          />
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <p className="text-gray-400 text-sm font-semibold animate-bounce">
            현재 <span className="text-[#FF4D94] font-extrabold">LIVE</span> 매칭 진행 중! 버튼을
            눌러 입장하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
