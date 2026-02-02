import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Megaphone,
  HelpCircle,
  LogOut,
  UserMinus,
  ShieldCheck,
  Camera,
  Star,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { getUserInfo, logout, withdraw } from '@/lib/api';

export default function MyPage() {
  const navigate = useNavigate();
  const [serverData, setServerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. 초기 데이터 페칭
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await getUserInfo();
        if (response && response.success) {
          setServerData(response.data);
        }
      } catch (error: any) {
        console.error('유저 정보를 불러오지 못했습니다:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // 2. 로그아웃 핸들러
  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    try {
      const res = await logout();
      if (res.success) {
        localStorage.removeItem('accessToken');
        alert('로그아웃 되었습니다.');
        navigate('/'); // 랜딩 페이지로 이동
      }
    } catch (error) {
      console.error('로그아웃 실패:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  // 3. 회원탈퇴 핸들러
  const handleWithdraw = async () => {
    if (!confirm('정말로 탈퇴하시겠습니까? 모든 정보가 삭제됩니다.')) return;
    try {
      const res = await withdraw();
      if (res.success) {
        localStorage.removeItem('accessToken');
        alert('회원 탈퇴가 완료되었습니다.');
        navigate('/');
      }
    } catch (error) {
      console.error('회원탈퇴 실패:', error);
      alert('탈퇴 처리 중 오류가 발생했습니다.');
    }
  };

  const userInfo = {
    name: serverData?.nickname || serverData?.name || '라운디 유저',
    age: serverData?.age || 29,
    profileImage: serverData?.profilePhotoUrl || serverData?.profileImageUrl || null,
    matchRate: 85,
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FAFBFF]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-[#FF4D94]"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto font-['Pretendard'] no-scrollbar transition-colors duration-300">
      <Header />

      <main className="flex-1 p-6 md:p-10 lg:px-20 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8 px-2">
            <h1 className="text-3xl font-black text-[#1A1F36] dark:text-white tracking-tight">
              My page
            </h1>
          </div>

          <div className="space-y-12">
            {/* 프로필 카드 섹션 */}
            <div className="relative group">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[80%] bg-gradient-to-r from-[#FF4D94] to-[#7C3AED] opacity-20 blur-[60px] rounded-full pointer-events-none" />
              <div className="relative bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-white dark:border-white/10 rounded-[40px] p-8 md:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-center gap-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-pink-50 dark:from-pink-900/20 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />
                <div className="relative shrink-0">
                  <div className="w-32 h-32 md:w-36 md:h-36 rounded-full p-[4px] bg-gradient-to-tr from-[#FF4D94] to-[#7C3AED] shadow-xl shadow-pink-100">
                    <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 p-1">
                      <div className="w-full h-full rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                        {userInfo.profileImage ? (
                          <img
                            src={userInfo.profileImage}
                            alt="프로필"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIconPlaceholder />
                        )}
                      </div>
                    </div>
                  </div>
                  <button className="absolute bottom-1 right-1 w-10 h-10 bg-[#1A1F36] dark:bg-white text-white dark:text-[#1A1F36] rounded-full flex items-center justify-center border-[3px] border-white shadow-lg">
                    <Camera size={18} />
                  </button>
                </div>

                <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-5 w-full">
                  <div>
                    <h2 className="text-3xl font-black text-[#1A1F36] dark:text-white mb-1 flex items-center gap-2">
                      {userInfo.name}
                      <span className="text-lg font-bold text-[#FF4D94] bg-[#FF4D94]/10 px-3 py-1 rounded-full">
                        {userInfo.age}
                      </span>
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 w-full justify-center md:justify-start">
                    <div className="w-full md:w-auto min-w-[140px] bg-gray-50 dark:bg-white/5 rounded-2xl p-3 border border-gray-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-[#7C3AED]">
                        <Star size={16} fill="currentColor" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-[11px] text-gray-400 font-bold">매칭 확률</span>
                        <span className="text-sm font-black text-[#1A1F36] dark:text-white">
                          {userInfo.matchRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="w-full md:w-auto mt-1 px-8 py-3 bg-[#1A1F36] dark:bg-white text-white dark:text-[#1A1F36] rounded-xl font-bold text-sm shadow-lg hover:bg-[#FF4D94] hover:text-white transition-all">
                    프로필 상세 수정
                  </button>
                </div>
              </div>
            </div>

            {/* 고객 지원 섹션 */}
            <section className="space-y-7">
              <h3 className="text-lg pb-1 font-black text-[#1A1F36] dark:text-white ml-2 flex items-center gap-3">
                <div className="w-[3px] h-5 bg-[#FF4D94]" />
                고객 지원
              </h3>
              <div className="bg-white/80 dark:bg-black/40 backdrop-blur-sm rounded-[28px] overflow-hidden border border-white dark:border-white/10 shadow-sm transition-colors duration-300">
                <MenuLink
                  icon={<Megaphone size={20} className="text-[#FF4D94]" />}
                  label="공지사항 & 서비스 정책"
                />
                <div className="h-[1px] bg-gray-50 dark:bg-white/5 mx-6" />
                <MenuLink
                  icon={<HelpCircle size={20} className="text-[#FF4D94]" />}
                  label="자주 묻는 질문 (FAQ)"
                />
              </div>
            </section>

            {/* 계정 설정 섹션 (로그아웃/탈퇴 이벤트 연결) */}
            <section className="space-y-7">
              <h3 className="text-lg pb-1 font-black text-[#1A1F36] dark:text-white ml-2 flex items-center gap-3">
                <div className="w-[3px] h-5 bg-[#7C3AED]" />
                계정 설정
              </h3>
              <div className="bg-white/80 dark:bg-black/40 backdrop-blur-sm rounded-[28px] overflow-hidden border border-white dark:border-white/10 shadow-sm transition-colors duration-300">
                <MenuLink
                  icon={
                    <ShieldCheck size={20} className="text-gray-400 group-hover:text-[#7C3AED]" />
                  }
                  label="개인정보 수정"
                />
                <div className="h-[1px] bg-gray-50 dark:bg-white/5 mx-6" />
                {/* 로그아웃 클릭 이벤트 연결 */}
                <MenuLink
                  icon={<LogOut size={20} className="text-gray-400 group-hover:text-[#7C3AED]" />}
                  label="로그아웃"
                  onClick={handleLogout}
                />
                <div className="h-[1px] bg-gray-50 dark:bg-white/5 mx-6" />
                {/* 회원탈퇴 클릭 이벤트 연결 */}
                <MenuLink
                  icon={<UserMinus size={20} className="text-gray-400 group-hover:text-red-500" />}
                  label="회원탈퇴"
                  isDanger
                  onClick={handleWithdraw}
                />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

// MenuLink 컴포넌트에 onClick prop 추가
function MenuLink({
  icon,
  label,
  isDanger = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  isDanger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50/80 dark:hover:bg-white/5 transition-all group active:scale-[0.99]"
    >
      <div className="flex items-center gap-4">
        <div
          className={`p-2.5 rounded-2xl bg-gray-50 dark:bg-white/5 group-hover:bg-white transition-all duration-300 ${isDanger ? 'group-hover:bg-red-50' : ''}`}
        >
          {icon}
        </div>
        <span
          className={`font-bold text-lg ${isDanger ? 'text-gray-400 group-hover:text-red-500' : 'text-[#1A1F36] dark:text-gray-200'}`}
        >
          {label}
        </span>
      </div>
      <ChevronRight
        size={20}
        className="text-gray-300 group-hover:text-[#1A1F36] transition-all group-hover:translate-x-1"
      />
    </button>
  );
}

const UserIconPlaceholder = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="opacity-40">
    <path
      d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
