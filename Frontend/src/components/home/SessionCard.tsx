import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import premiumThemeImg from '@/assets/premium-theme.png';
import { Skeleton } from '@/components/ui/skeleton';

export function SessionCardSkeleton() {
  return (
    <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-[40px] shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[520px]">
      <div className="flex-1 relative overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>
      <div className="flex-1 p-12 flex flex-col justify-center bg-white dark:bg-gray-800/50 space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-[80%] rounded" />
          <Skeleton className="h-4 w-[60%] rounded" />
        </div>
        <div className="space-y-3 pt-4">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-12 rounded" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <Skeleton className="h-16 w-full rounded-2xl" />
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

  return (
    <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-[40px] shadow-xl dark:shadow-[0_0_40px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col md:flex-row min-h-[520px] transition-colors duration-300">
      {/* 테마 이미지 영역 */}
      <div className="flex-1 relative overflow-hidden group">
        <img
          src={premiumThemeImg}
          alt="Premium Theme"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <p className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-[0.3em] text-white uppercase z-10 drop-shadow-md">
          Premium Theme
        </p>
      </div>

      {/* 상세 정보 영역 */}
      <div className="flex-1 p-12 flex flex-col justify-center bg-white dark:bg-gray-800/50 backdrop-blur-sm relative transition-colors duration-300">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1 bg-[#FF4D94] text-white px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase shadow-sm">
            <Star size={10} fill="white" /> Best
          </div>
          <span className="text-xs font-bold text-gray-400 tracking-tight">
            현재 참여 가능한 미팅
          </span>
        </div>

        <h1 className="text-3xl font-extrabold text-[#1A1F36] dark:text-white mb-6 leading-tight tracking-tight transition-colors">
          로테이션 소개팅(Basic)
        </h1>

        <p className="text-gray-500 dark:text-gray-400 mb-10 leading-relaxed text-sm font-medium transition-colors">
          <br />
          기다림 없는 설렘, 라운디의 시그니처 로테이션 시스템. <br />
          1:1 대화를 통해 정해진 시간동안 모든 참가자와 대화하며, <br />
          나만의 특별한 인연을 발견해 보세요.
        </p>

        <div className="mb-8">
          <div className="flex justify-between items-end mb-3">
            <div className="flex flex-col">
              <span className="text-[11px] text-gray-400 font-bold uppercase mb-1">
                참여자 현황
              </span>
              <span className="text-sm font-bold text-[#1A1F36] dark:text-white transition-colors">
                남 {maleCount}/{maxPerGender}명, 여 {femaleCount}/{maxPerGender}명 신청 중
              </span>
            </div>
            <span className="text-xs font-bold text-[#FF4D94]">{progress}% 진행중</span>
          </div>
          <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden transition-colors">
            <div
              className="h-full bg-gradient-to-r from-[#FF4D94] to-[#7C3AED] transition-all duration-700 shadow-[0_0_10px_rgba(255,77,148,0.5)]"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* --- 그라데이션 애니메이션 버튼 (호버/트랜스폼 제거) --- */}
        <Button
          onClick={onJoin}
          className="w-full py-8 text-white rounded-2xl text-lg font-bold shadow-xl overflow-hidden active:scale-95 transition-transform"
          style={{
            background: 'linear-gradient(270deg, #FF4D94, #7C3AED, #FF4D94)',
            backgroundSize: '200% 100%',
            animation: 'movingGradient 4s linear infinite',
          }}
        >
          참여 신청하기
        </Button>

        <p className="text-center mt-5 text-[12px] text-gray-400">
          마감 임박! 참여하실 수 있는 자리가{' '}
          <span className="font-bold text-[#FF4D94]">{remainingForMe}개</span> 남아있습니다.
        </p>
      </div>

      {/* 버튼 그라데이션 애니메이션 */}
      <style>{`
        @keyframes movingGradient {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </div>
  );
}
