import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import SessionCard, { SessionCardSkeleton } from '@/components/home/SessionCard';

export default function HomePage() {
  const navigate = useNavigate();

  // TODO: 로컬스토리지에서 사용자 정보 가져오기
  const userGender = 'MALE';
  const [isLoading, setIsLoading] = useState(false); // 고정 데이터이므로 즉시 노출
  const [sessionData] = useState({
    maleCount: 1,
    femaleCount: 1,
    maxPerGender: 3,
  });

  useEffect(() => {
    // 향후 실제 API 연동 시 isLoading을 true로 시작하고 fetch 완료 후 false로 변경
  }, []);

  const handleJoinClick = () => navigate('/verify');

  return (
    <div className="h-full flex flex-col p-8 relative">
      <Header />

      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className="z-10 w-full max-w-[1400px] flex justify-center items-center transition-all">
          {isLoading ? (
            <SessionCardSkeleton />
          ) : (
            <SessionCard
              userGender={userGender}
              maleCount={sessionData.maleCount}
              femaleCount={sessionData.femaleCount}
              maxPerGender={sessionData.maxPerGender}
              onJoin={handleJoinClick}
            />
          )}
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