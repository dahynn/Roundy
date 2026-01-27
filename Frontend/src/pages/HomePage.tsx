import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Header from '@/components/layout/Header';
import SessionCard from '@/components/home/SessionCard';

export default function HomePage() {
  const navigate = useNavigate();

  // 현재 유저 성별 (임시 설정: 남성)
  const userGender = 'MALE';

  // 실시간 세션 데이터 (남녀 분리 카운팅)
  const [sessionData] = useState({
    maleCount: 1, // 현재 남자 1명
    femaleCount: 1, // 현재 여자 1명
    maxPerGender: 3,
    totalMax: 6,
  });

  const handleJoinClick = () => {
    const currentGenderCount =
      userGender === 'MALE' ? sessionData.maleCount : sessionData.femaleCount;

    // 정원 초과 체크
    if (currentGenderCount >= sessionData.maxPerGender) {
      alert('죄송합니다. 해당 성별의 정원이 마감되었습니다.');
      return;
    }

    // 즉시 본인 인증 페이지로 이동
    navigate('/verify');
  };

  return (
    <div className="min-h-screen bg-[#FAFBFF] flex font-['Pretendard']">
      <Navbar />
      <main className="flex-1 ml-64 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-8">
          <SessionCard
            userGender={userGender}
            maleCount={sessionData.maleCount}
            femaleCount={sessionData.femaleCount}
            maxPerGender={sessionData.maxPerGender}
            onJoin={handleJoinClick}
          />
        </div>
      </main>
    </div>
  );
}
