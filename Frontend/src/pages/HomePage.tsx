import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import SessionCard, { SessionCardSkeleton } from '@/components/home/SessionCard';
import { getSessionStatus } from '@/api/session';
import type { SessionStatusResponse } from '@/api/session';
import { useState, useEffect } from 'react';
import premiumThemeImg from '@/assets/premium-theme.webp';

export default function HomePage() {
  const navigate = useNavigate();

  const [userGender, setUserGender] = useState<string>(() => {
    const stored = localStorage.getItem('userGender');
    return stored || 'MALE';
  });

  const [isLoading, setIsLoading] = useState(true);
  const [sessionData, setSessionData] = useState<SessionStatusResponse>({
    maleCount: 0,
    femaleCount: 0,
    totalCount: 0,
    availableSlots: 3,
  });

  // 세션 현황 폴링 및 이미지 프리로딩
  useEffect(() => {
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const data = await getSessionStatus();
        if (isMounted && data) {
          setSessionData({
            maleCount: data.maleCount,
            femaleCount: data.femaleCount,
            totalCount: data.totalCount,
            availableSlots: data.availableSlots
          });
        }
      } catch (error) {
        console.error("세션 정보를 불러오는데 실패했습니다:", error);
      }
    };

    const preloadImage = () => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = premiumThemeImg;
        img.onload = resolve;
        img.onerror = reject;
      });
    };

    const init = async () => {
      try {
        // 초기 로딩 시 데이터와 이미지를 함께 대기
        await Promise.all([fetchStatus(), preloadImage()]);
      } catch (error) {
        console.warn("일부 데이터 로딩에 실패했지만 진행합니다.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    init();
    const interval = setInterval(fetchStatus, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
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
              maxPerGender={sessionData.availableSlots}
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