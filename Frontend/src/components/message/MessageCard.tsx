import { ChevronRight } from 'lucide-react';
import defaultProfile from '@/assets/default-profile.png';

interface MessageCardProps {
    id: number;
    opponentName: string;
    profileImgUrl: string;
    lastMessageContent: string;
    hasNew: boolean;
    time: string;
    onClick: () => void;
}

export default function MessageCard({
    opponentName,
    profileImgUrl,
    lastMessageContent,
    hasNew,
    time,
    onClick,
}: MessageCardProps) {
    return (
        <div
            onClick={onClick}
            className="group relative flex items-center p-5 rounded-[28px] bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-white dark:border-white/5 shadow-sm hover:shadow-[0_8px_24px_rgba(255,77,148,0.15)] hover:border-pink-100 dark:hover:border-pink-500/30 transition-all duration-300 cursor-pointer hover:-translate-y-1"
        >
            {/* 1. 프로필 이미지 (그라데이션 링) */}
            <div className="relative mr-6 shrink-0">
                <div
                    className={`w-[68px] h-[68px] rounded-full p-[2px] ${hasNew
                        ? 'bg-gradient-to-tr from-[#FF4D94] to-[#7C3AED]'
                        : 'bg-gray-100 dark:bg-gray-700'
                        }`}
                >
                    <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 p-[2px]">
                        <img
                            src={profileImgUrl || defaultProfile}
                            alt="Profile"
                            className="w-full h-full object-cover rounded-full"
                        />
                    </div>
                </div>
                {/* NEW 뱃지 (프로필 우측 하단) */}
                {hasNew && (
                    <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#FF4D94] border-[3px] border-white rounded-full" />
                )}
            </div>

            <div className="flex-1 min-w-0 py-1">
                {/* 2. 이름 및 시간 */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="font-black text-[#1A1F36] dark:text-white text-lg tracking-tight group-hover:text-[#FF4D94] dark:group-hover:text-[#FF4D94] transition-colors">
                            {opponentName}
                        </span>
                        {hasNew && (
                            <span className="bg-gradient-to-r from-[#FF4D94] to-[#F43F5E] text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm shadow-pink-200 dark:shadow-none">
                                NEW
                            </span>
                        )}
                    </div>
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                        {time || '방금 전'}
                    </span>
                </div>

                {/* 3. 말풍선 내용 */}
                <p
                    className={`text-base truncate tracking-tight transition-colors ${hasNew
                        ? 'text-[#1A1F36] dark:text-gray-200 font-bold'
                        : 'text-[#697386] dark:text-gray-400 font-medium'
                        }`}
                >
                    {lastMessageContent}
                </p>
            </div>

            {/* 4. 우측 화살표 (호버 시 이동 애니메이션) */}
            <div className="ml-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-white/10 text-gray-300 dark:text-gray-500 group-hover:bg-[#FF4D94] dark:group-hover:bg-[#FF4D94] group-hover:text-white transition-all duration-300 group-hover:translate-x-1">
                <ChevronRight size={18} strokeWidth={3} />
            </div>
        </div>
    );
}
