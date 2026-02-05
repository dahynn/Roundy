import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Users, Ticket, ArrowRight } from 'lucide-react'; // ArrowRight 추가
import premiumThemeImg from '@/assets/premium-theme.png';

export function SessionCardSkeleton() {
  return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-[40px] shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row min-h-[520px] animate-pulse">
          <div className="flex-1 bg-gray-200 dark:bg-gray-800" />

          <div className="flex-1 p-12 flex flex-col justify-center space-y-6">
            <div className="space-y-2 mb-2">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4" />
              <div className="flex items-center gap-2">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
            </div>
            <div className="h-28 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
            <div className="h-[64px] bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          </div>
        </div>
      </div>
  );
}

interface Props {
  userGender: string;
  maleCount: number;
  femaleCount: number;
  maxPerGender: number;
  onJoin: () => void;
}

export default function SessionCard({
                                      userGender,
                                      maleCount,
                                      femaleCount,
                                      maxPerGender,
                                      onJoin,
                                    }: Props) {
  const totalCurrent = maleCount + femaleCount;
  const totalMax = maxPerGender * 2;
  const progress = Math.floor((totalCurrent / totalMax) * 100);

  const myGenderCount = userGender === 'MALE' ? maleCount : femaleCount;
  const remainingForMe = maxPerGender - myGenderCount;

  const isUrgent = remainingForMe <= 2;

  return (
      <div className="w-full max-w-4xl mx-auto group">
        <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-[40px] shadow-2xl shadow-black/5 border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row min-h-[520px] transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">

          <div className="flex-1 relative overflow-hidden">
            <img
                src={premiumThemeImg}
                alt="Premium Theme"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/50 md:to-transparent" />

            <div className="absolute top-8 left-8">
              <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1.5 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase shadow-lg">
                <Sparkles size={10} className="text-[#FF4D94]" fill="#FF4D94" />
                Premium Theme
              </div>
            </div>
          </div>

          <div className="flex-1 p-12 flex flex-col justify-center relative bg-white dark:bg-[#0f1117]">

            <div className="mb-6">
              <h1 className="text-3xl md:text-[36px] font-extrabold text-[#1A1F36] dark:text-white leading-tight tracking-tight">
                로테이션 소개팅
              </h1>

              <div className="flex items-center gap-3 mt-0">
              <span className="text-3xl font-light text-gray-300 dark:text-gray-600 tracking-tight">
                Basic
              </span>
              </div>
            </div>

            <p className="text-gray-500 dark:text-gray-400 mb-10 leading-relaxed text-sm font-medium">
              기다림 없는 설렘, 라운디의 시그니처 로테이션 시스템. <br />
              1:1 대화를 통해 정해진 시간동안 모든 참가자와 대화하며, <br />
              나만의 특별한 인연을 발견해 보세요.
            </p>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 mb-8 border border-gray-100 dark:border-gray-700/50">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                  <Users size={16} className="text-gray-400" />
                  <span>참여자 현황</span>
                </div>
                <span className="text-xs font-bold text-[#FF4D94] bg-[#FF4D94]/10 px-2 py-0.5 rounded-md">
                {progress}% 모집됨
              </span>
              </div>

              <Progress
                  value={progress}
                  className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full [&>div]:bg-gradient-to-r [&>div]:from-[#FF4D94] [&>div]:to-[#7C3AED] mb-3"
              />

              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 font-medium">
                <div className="flex gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  남성 {maleCount}/{maxPerGender}
                </span>
                  <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF4D94]"></span>
                  여성 {femaleCount}/{maxPerGender}
                </span>
                </div>
                <span>Total {totalCurrent}명</span>
              </div>
            </div>

            <Button
                onClick={onJoin}
                className="group/btn relative w-full h-[68px] rounded-2xl shadow-xl shadow-pink-500/20 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-pink-500/40 active:scale-95 p-0 border-0"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#FF4D94] to-[#7C3AED] transition-all duration-300 group-hover/btn:saturate-[1.2]" />
              <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent transition-opacity duration-500" />

              <div className="relative z-10 w-full h-full flex items-center justify-between pl-7 pr-5">

                <span className="text-white text-[19px] font-bold tracking-tight leading-none">
                지금 참여하기
              </span>

                <div className="flex items-center h-full">

                  <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/40 to-transparent mx-5" />

                  <div className={`flex flex-col items-end justify-center mr-4 transition-colors duration-300 ${isUrgent ? 'text-red-100 animate-pulse' : 'text-white/90'}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Ticket size={14} className={isUrgent ? "fill-red-200/50 text-red-100" : "text-white/70"} />
                      <span className="text-[11px] font-medium opacity-80">남은 자리</span>
                    </div>
                    <span className={`text-lg font-black leading-none ${isUrgent ? 'text-white' : ''}`}>
                    {remainingForMe}<span className="text-sm font-bold ml-0.5">개</span>
                  </span>
                  </div>

                  <ArrowRight size={24} className="text-white opacity-50 -translate-x-2 transition-all duration-300 group-hover/btn:opacity-100 group-hover/btn:translate-x-0" />

                </div>
              </div>
            </Button>

          </div>
        </div>
      </div>
  );
}