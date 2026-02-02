import React from 'react';
import {
  ChevronRight,
  Megaphone,
  HelpCircle,
  LogOut,
  UserMinus,
  ShieldCheck,
  Bell,
  Camera,
  Star
} from 'lucide-react';

export default function MyPage() {

  // TODO : 유저 연결 후 수정
  const userInfo = {
    name: '김민수',
    age: 29,
    profileImage: null,
    matchRate: 85,
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto font-['Pretendard'] no-scrollbar">
      


      <main className="flex-1 p-6 md:p-10 lg:px-20 pb-20">
        <div className="max-w-3xl mx-auto">
          
          <div className="flex items-center justify-between mb-6 px-2">
            <h1 className="text-3xl font-black text-[#1A1F36] tracking-tight">마이페이지</h1>
            <button className="relative p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-[#FF4D94] hover:shadow-md transition-all">
              <Bell size={22} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#FF4D94] rounded-full ring-2 ring-white" />
            </button>
          </div>

          <div className="space-y-12">
            
            {/* 프로필 카드 섹션 */}
            <div className="relative group">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[80%] bg-gradient-to-r from-[#FF4D94] to-[#7C3AED] opacity-20 blur-[60px] rounded-full pointer-events-none" />

              <div className="relative bg-white/80 backdrop-blur-xl border border-white rounded-[40px] p-8 md:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-center gap-8 overflow-hidden">
                
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-pink-50 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

                {/* 1. 프로필 이미지 */}
                <div className="relative shrink-0">
                  <div className="w-32 h-32 md:w-36 md:h-36 rounded-full p-[4px] bg-gradient-to-tr from-[#FF4D94] to-[#7C3AED] shadow-xl shadow-pink-100">
                    <div className="w-full h-full rounded-full bg-white p-1">
                      <div className="w-full h-full rounded-full bg-gray-50 flex items-center justify-center overflow-hidden relative group-hover:scale-105 transition-transform duration-500">
                        {userInfo.profileImage ? (
                          <img src={userInfo.profileImage} alt="프로필" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-gray-300">
                             <UserIconPlaceholder />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button className="absolute bottom-1 right-1 w-10 h-10 bg-[#1A1F36] text-white rounded-full flex items-center justify-center border-[3px] border-white shadow-lg hover:bg-[#FF4D94] transition-colors">
                    <Camera size={18} />
                  </button>
                </div>

                {/* 2. 유저 정보 */}
                <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-5 w-full">
                  
                  <div>
                    <h2 className="text-3xl font-black text-[#1A1F36] mb-1 flex items-center gap-2 justify-center md:justify-start">
                      {userInfo.name}
                      <span className="text-lg font-bold text-[#FF4D94] bg-[#FF4D94]/10 px-3 py-1 rounded-full">
                        {userInfo.age}
                      </span>
                    </h2>
                  </div>

                  <div className="flex items-center gap-3 w-full justify-center md:justify-start">
                     <div className="w-full md:w-auto min-w-[140px] bg-gray-50 rounded-2xl p-3 border border-gray-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-[#7C3AED]">
                          <Star size={16} fill="currentColor" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-[11px] text-gray-400 font-bold">매칭 확률</span>
                          <span className="text-sm font-black text-[#1A1F36]">{userInfo.matchRate}%</span>
                        </div>
                     </div>
                  </div>

                  <button className="w-full md:w-auto mt-1 px-8 py-3 bg-[#1A1F36] text-white rounded-xl font-bold text-sm shadow-lg hover:bg-[#FF4D94] hover:shadow-pink-200 hover:-translate-y-0.5 transition-all duration-300">
                    프로필 상세 수정
                  </button>
                </div>

              </div>
            </div>


            {/* 고객 지원 */}
            <section className="space-y-7">
              <h3 className="text-lg pb-1 font-black text-[#1A1F36] ml-2 flex items-center gap-3">
                <div className="w-[3px] h-5 bg-[#FF4D94]" />
                고객 지원
              </h3>
              <div className="bg-white/80 backdrop-blur-sm rounded-[28px] overflow-hidden border border-white shadow-sm">
                <MenuLink
                  icon={<Megaphone size={20} className="text-[#FF4D94]" />}
                  label="공지사항 & 서비스 정책"
                />
                <div className="h-[1px] bg-gray-50 mx-6" />
                <MenuLink icon={<HelpCircle size={20} className="text-[#FF4D94]" />} label="자주 묻는 질문 (FAQ)" />
              </div>
            </section>

            {/* 계정 설정 */}
            <section className="space-y-7">
              <h3 className="text-lg pb-1 font-black text-[#1A1F36] ml-2 flex items-center gap-3">
                <div className="w-[3px] h-5 bg-[#7C3AED]" />
                계정 설정
              </h3>
              <div className="bg-white/80 backdrop-blur-sm rounded-[28px] overflow-hidden border border-white shadow-sm">
                <MenuLink
                  icon={<ShieldCheck size={20} className="text-gray-400 group-hover:text-[#7C3AED]" />}
                  label="개인정보 수정"
                />
                <div className="h-[1px] bg-gray-50 mx-6" />
                <MenuLink icon={<LogOut size={20} className="text-gray-400 group-hover:text-[#7C3AED]" />} label="로그아웃" />
                <div className="h-[1px] bg-gray-50 mx-6" />
                <MenuLink icon={<UserMinus size={20} className="text-gray-400 group-hover:text-red-500" />} label="회원탈퇴" isDanger />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

// 개별 메뉴 아이템 컴포넌트
function MenuLink({ icon, label, isDanger = false }: { icon: React.ReactNode; label: string, isDanger?: boolean }) {
  return (
    <button className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50/80 transition-all group active:scale-[0.99]">
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-2xl bg-gray-50 group-hover:bg-white group-hover:shadow-sm transition-all duration-300 ${isDanger ? 'group-hover:bg-red-50' : ''}`}>
          {icon}
        </div>
        <span className={`font-bold text-lg ${isDanger ? 'text-gray-400 group-hover:text-red-500' : 'text-[#1A1F36]'}`}>{label}</span>
      </div>
      <ChevronRight size={20} className="text-gray-300 group-hover:text-[#1A1F36] transition-all opacity-50 group-hover:opacity-100 group-hover:translate-x-1" />
    </button>
  );
}

// 아이콘 플레이스홀더
const UserIconPlaceholder = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-40">
    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);