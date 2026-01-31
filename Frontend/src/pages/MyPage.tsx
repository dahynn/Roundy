import React from 'react';
import {
  ChevronRight,
  Megaphone,
  HelpCircle,
  LogOut,
  UserMinus,
  ShieldCheck,
  Bell,
} from 'lucide-react';
import Header from '@/components/layout/Header';

export default function MyPage() {
  // 실제 데이터 연결 시 사용할 임시 데이터
  const userInfo = {
    name: '김민수',
    age: 29,
    job: 'IT 기획자',
    location: '서울',
    rating: 4.2,
    profileImage: '', // 이미지 경로
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#FAFBFF] font-['Pretendard']">
      {/* 1. 상단 헤더 (기존 Header 컴포넌트 사용 또는 커스텀) */}
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-12 shrink-0">
        <h1 className="text-2xl font-black text-[#1A1F36]">마이페이지</h1>
        <button className="p-2.5 bg-gray-50 rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
          <Bell size={22} />
        </button>
      </header>

      {/* 2. 메인 스크롤 영역 */}
      <main className="flex-1 overflow-y-auto p-8 md:p-12 lg:px-20 lg:py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* 프로필 카드 섹션 */}
          <div className="bg-white rounded-[40px] p-10 shadow-sm border border-gray-100 flex items-center gap-10 relative overflow-hidden">
            {/* 배경 미세 효과 */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-pink-50/50 rounded-full blur-3xl -mr-20 -mt-20" />

            {/* 프로필 이미지 (회색 박스 대용) */}
            <div className="w-32 h-32 rounded-[32px] bg-gray-100 flex items-center justify-center shrink-0 border border-gray-50 shadow-inner">
              <span className="text-gray-300 font-bold text-sm">NO IMAGE</span>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black text-[#1A1F36]">
                  {userInfo.name}, {userInfo.age}
                </h2>
                <div className="bg-pink-50 text-[#FF4D94] px-3 py-1 rounded-full text-sm font-black flex items-center gap-1">
                  ⭐ {userInfo.rating}
                </div>
              </div>
              <p className="text-gray-400 font-bold text-lg">
                {userInfo.location} · {userInfo.job}
              </p>

              <button className="px-6 py-2.5 bg-gray-50 text-gray-700 rounded-2xl text-sm font-black hover:bg-gray-100 transition-all border border-gray-100">
                프로필 수정
              </button>
            </div>
          </div>

          {/* 메뉴 그룹 1: 도움말 */}
          <section className="space-y-4">
            <h3 className="text-lg font-black text-[#1A1F36] ml-2 italic">도움</h3>
            <div className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm">
              <MenuLink
                icon={<Megaphone size={20} className="text-[#FF4D94]" />}
                label="서비스 정책"
              />
              <div className="h-[1px] bg-gray-50 mx-6" />
              <MenuLink icon={<HelpCircle size={20} className="text-[#FF4D94]" />} label="FAQ" />
            </div>
          </section>

          {/* 메뉴 그룹 2: 계정 */}
          <section className="space-y-4">
            <h3 className="text-lg font-black text-[#1A1F36] ml-2 italic">계정</h3>
            <div className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm">
              <MenuLink icon={<LogOut size={20} className="text-gray-400" />} label="로그아웃" />
              <div className="h-[1px] bg-gray-50 mx-6" />
              <MenuLink icon={<UserMinus size={20} className="text-gray-400" />} label="회원탈퇴" />
              <div className="h-[1px] bg-gray-50 mx-6" />
              <MenuLink
                icon={<ShieldCheck size={20} className="text-gray-400" />}
                label="개인정보 수정"
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// 개별 메뉴 아이템 컴포넌트
function MenuLink({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="w-full flex items-center justify-between px-8 py-6 hover:bg-gray-50 transition-all group">
      <div className="flex items-center gap-5">
        <div className="p-2.5 rounded-2xl bg-gray-50 group-hover:bg-white transition-colors">
          {icon}
        </div>
        <span className="font-bold text-[#1A1F36] text-lg">{label}</span>
      </div>
      <ChevronRight size={20} className="text-gray-300 group-hover:text-[#FF4D94] transition-all" />
    </button>
  );
}
