import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Megaphone,
  HelpCircle,
  LogOut,
  UserMinus,
  ShieldCheck,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { logout, withdraw } from '@/api/user';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/components/ui/toast-context';

// ✅ 만나이 계산 유틸리티
const calculateAge = (birthDateString: string) => {
  if (!birthDateString) return 0;
  const birthDate = new Date(birthDateString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export default function MyPage() {
  const navigate = useNavigate();
  const { userInfo: serverData, isLoading: loading, refreshUser } = useUser();

  const { toast, confirm } = useToast();

  useEffect(() => {
    if (!serverData) {
      refreshUser();
    }
  }, [serverData, refreshUser]);

  const handleLogout = () => {
    confirm('정말 로그아웃 하시겠습니까?', async () => {
      try {
        await logout();
        localStorage.removeItem('accessToken');
        toast('로그아웃 되었습니다.', 'success');
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } catch (error) {
        console.error('로그아웃 실패:', error);
        localStorage.removeItem('accessToken');
        window.location.href = '/';
      }
    });
  };

  const handleWithdraw = () => {
    confirm('정말로 탈퇴하시겠습니까? 모든 정보가 삭제됩니다.', async () => {
      try {
        await withdraw();
        localStorage.removeItem('accessToken');
        toast('회원 탈퇴가 완료되었습니다. 이용해주셔서 감사합니다.', 'success');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } catch (error) {
        console.error('회원탈퇴 실패:', error);
        toast('탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'error');
      }
    });
  };

  const userInfo = {
    name: serverData?.nickname || serverData?.name || '라운디 유저',
    age: serverData?.birthDate ? calculateAge(serverData.birthDate) : 0,
    profileImage: serverData?.profileImageUrl || null,
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto font-['Pretendard'] no-scrollbar">
      <Header />

      <main className="flex-1 p-6 md:p-10 lg:px-20 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8 px-2">
            <h1 className="text-3xl font-black text-[#1A1F36] dark:text-white tracking-tight">
              My page
            </h1>
          </div>

          <div className="space-y-12">
            {loading && !serverData ? (
              <div className="space-y-12 animate-in fade-in duration-300">
                {/* 프로필 카드 스켈레톤 */}
                <div className="relative bg-white/80 dark:bg-black/40 border border-gray-100 dark:border-white/10 rounded-[40px] p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 overflow-hidden">
                  <Skeleton className="w-32 h-32 md:w-36 md:h-36 rounded-full shrink-0" />
                  <div className="flex-1 flex flex-col items-center md:items-start gap-4 w-full">
                    <Skeleton className="h-8 w-48 rounded-lg" />
                    <Skeleton className="h-10 w-full md:w-40 rounded-xl mt-2" />
                  </div>
                </div>

                {/* 메뉴 스켈레톤 */}
                <div className="space-y-6">
                  <Skeleton className="h-6 w-32 rounded ml-2" />
                  <div className="bg-white/80 dark:bg-black/40 rounded-[28px] overflow-hidden border border-gray-100 dark:border-white/10 p-1 space-y-1">
                    <Skeleton className="h-16 w-full rounded-2xl" />
                    <Skeleton className="h-16 w-full rounded-2xl" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* 프로필 카드 섹션 */}
                <div className="relative group">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[80%] bg-gradient-to-r from-[#FF4D94] to-[#7C3AED] opacity-20 blur-[60px] rounded-full pointer-events-none" />

                  <div className="relative bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-white dark:border-white/10 rounded-[40px] p-8 md:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-center gap-8 overflow-hidden transition-colors duration-300">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-pink-50 dark:from-pink-900/20 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

                    <div className="relative shrink-0">
                      <div className="w-32 h-32 md:w-36 md:h-36 rounded-full p-[4px] bg-gradient-to-tr from-[#FF4D94] to-[#7C3AED] shadow-xl shadow-pink-100 dark:shadow-none">
                        <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 p-1">
                          <div className="w-full h-full rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden relative transition-transform duration-500">
                            {userInfo.profileImage ? (
                              <img
                                src={userInfo.profileImage}
                                alt="프로필"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement
                                    ?.querySelector('.placeholder-icon')
                                    ?.classList.remove('hidden');
                                }}
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-gray-300 dark:text-gray-600">
                                <UserIconPlaceholder />
                              </div>
                            )}
                            <div className="placeholder-icon hidden absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-300">
                              <UserIconPlaceholder />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-5 w-full">
                      <div>
                        <h2 className="text-3xl font-black text-[#1A1F36] dark:text-white mb-1 flex items-center gap-2 justify-center md:justify-start transition-colors">
                          {userInfo.name}
                          <span className="text-lg font-bold text-[#FF4D94] bg-[#FF4D94]/10 dark:bg-[#FF4D94]/20 px-3 py-1 rounded-full">
                            {userInfo.age}세
                          </span>
                        </h2>
                      </div>
                      <button className="w-full md:w-auto mt-1 px-8 py-3 bg-[#1A1F36] dark:bg-white text-white dark:text-[#1A1F36] rounded-xl font-bold text-sm shadow-lg hover:bg-[#FF4D94] dark:hover:bg-[#FF4D94] dark:hover:text-white hover:shadow-pink-200 hover:-translate-y-0.5 transition-all duration-300">
                        프로필 상세 수정
                      </button>
                    </div>
                  </div>
                </div>

                {/* 고객 지원 */}
                <section className="space-y-7">
                  <h3 className="text-lg pb-1 font-black text-[#1A1F36] dark:text-white ml-2 flex items-center gap-3 transition-colors">
                    <div className="w-[3px] h-5 bg-[#FF4D94]" />
                    고객 지원
                  </h3>
                  <div className="bg-white/80 dark:bg-black/40 backdrop-blur-sm rounded-[28px] overflow-hidden border border-white dark:border-white/10 shadow-sm transition-colors duration-300">
                    <MenuLink
                      icon={<Megaphone size={20} className="text-[#FF4D94]" />}
                      label="공지사항 & 서비스 정책"
                      onClick={() => navigate('/notices')}
                    />
                    <div className="h-[1px] bg-gray-50 dark:bg-white/5 mx-6" />
                    <MenuLink
                      icon={<HelpCircle size={20} className="text-[#FF4D94]" />}
                      label="자주 묻는 질문 (FAQ)"
                      onClick={() => navigate('/faq')}
                    />
                  </div>
                </section>

                {/* 계정 설정 */}
                <section className="space-y-7">
                  <h3 className="text-lg pb-1 font-black text-[#1A1F36] dark:text-white ml-2 flex items-center gap-3 transition-colors">
                    <div className="w-[3px] h-5 bg-[#7C3AED]" />
                    계정 설정
                  </h3>
                  <div className="bg-white/80 dark:bg-black/40 backdrop-blur-sm rounded-[28px] overflow-hidden border border-white dark:border-white/10 shadow-sm transition-colors duration-300">
                    <MenuLink
                      icon={
                        <ShieldCheck
                          size={20}
                          className="text-gray-400 dark:text-gray-500 group-hover:text-[#7C3AED] dark:group-hover:text-[#A78BFA]"
                        />
                      }
                      label="취향 분석 수정"
                      onClick={() => navigate('/mypage/preferences')}
                    />
                    <div className="h-[1px] bg-gray-50 dark:bg-white/5 mx-6" />
                    <MenuLink
                      icon={
                        <LogOut
                          size={20}
                          className="text-gray-400 dark:text-gray-500 group-hover:text-[#7C3AED] dark:group-hover:text-[#A78BFA]"
                        />
                      }
                      label="로그아웃"
                      onClick={handleLogout}
                    />
                    <div className="h-[1px] bg-gray-50 dark:bg-white/5 mx-6" />
                    <MenuLink
                      icon={
                        <UserMinus
                          size={20}
                          className="text-gray-400 dark:text-gray-500 group-hover:text-red-500 dark:group-hover:text-red-400"
                        />
                      }
                      label="회원탈퇴"
                      isDanger
                      onClick={handleWithdraw}
                    />
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function MenuLink({
  icon,
  label,
  onClick,
  isDanger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  isDanger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50/80 dark:hover:bg-white/5 transition-all group active:scale-[0.99]"
    >
      <div className="flex items-center gap-4">
        <div
          className={`p-2.5 rounded-2xl bg-gray-50 dark:bg-white/5 group-hover:bg-white dark:group-hover:bg-white/10 group-hover:shadow-sm transition-all duration-300 ${isDanger ? 'group-hover:bg-red-50 dark:group-hover:bg-red-900/10' : ''
            }`}
        >
          {icon}
        </div>
        <span
          className={`font-bold text-lg ${isDanger
            ? 'text-gray-300 dark:text-gray-500 group-hover:text-red-500 dark:group-hover:text-red-400'
            : 'text-[#1A1F36] dark:text-gray-200 group-hover:text-[#FF4D94] transition-colors'
            }`}
        >
          {label}
        </span>
      </div>
      <ChevronRight
        size={20}
        className="text-gray-300 dark:text-gray-600 group-hover:text-[#FF4D94] dark:group-hover:text-white transition-all opacity-50 group-hover:opacity-100 group-hover:translate-x-1"
      />
    </button>
  );
}

const UserIconPlaceholder = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="opacity-40"
  >
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