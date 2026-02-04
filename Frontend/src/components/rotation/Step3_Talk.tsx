import React, { useState, useEffect } from 'react';
import { User, Clock } from 'lucide-react';

interface Partner {
    id: number;
    name: string;
    gender: 'MALE' | 'FEMALE';
    preferences?: {
        hobbies: string[];
        mbti: string;
        interests: string[];
    };
}

import { getUserPreferences, type PreferenceType } from '../../api/preference';

export interface Step3_TalkProps {
    partners: Partner[];
    currentPartnerIndex: number;
    remainingTime: number;
    onPartnerChange?: (index: number) => void;
}

export const Step3_Talk: React.FC<Step3_TalkProps> = ({
    partners,
    currentPartnerIndex,
    remainingTime,
    onPartnerChange,
}) => {
    const currentPartner = partners[currentPartnerIndex];
    const totalPartners = partners.length;

    // SHORT 모드 전용 설정
    const title = "저는 이런 사람이에요 ✨";
    const maxTime = 120; // 2분
    const targetPrefs = ['PERSONALITY', 'APPEARANCE', 'TALENT']; // 하위 3개 (타입 4, 5, 6)

    // 취향 정보 State
    const [partnerPrefs, setPartnerPrefs] = useState<string[]>([]);

    // 파트너가 바뀔 때마다 취향 정보 가져오기
    useEffect(() => {
        if (currentPartner?.id) {
            // TODO: API 호출 (실제 환경에서 주석 해제)
            /*
            getUserPreferences(currentPartner.id).then(res => {
                const allPrefs: string[] = [];
                // SHORT 모드에 맞는 취향 타입만 필터링해서 가져옴
                targetPrefs.forEach(type => {
                    if (res.preferences[type as PreferenceType]) {
                        allPrefs.push(...res.preferences[type as PreferenceType]!);
                    }
                });

                // 고정: 처음 5개만 선택 (랜덤 제거)
                const fixed5 = allPrefs.slice(0, 5);
                setPartnerPrefs(fixed5);
            }).catch(err => {
                console.error('Failed to fetch preferences:', err);
                // Mock 데이터 fallback
                // 하위 3개 타입 (PERSONALITY, APPEARANCE, TALENT)
                const mockSource = ['차분한', '유머러스한', '활동적인', '맛집탐방', '영화감상'];
                setPartnerPrefs(mockSource);
            });
            */

            // Mock 데이터 (테스트용)
            // 하위 3개 타입 (PERSONALITY, APPEARANCE, TALENT)
            const mockSource = ['차분한', '유머러스한', '활동적인', '맛집탐방', '영화감상'];
            setPartnerPrefs(mockSource);
        }
    }, [currentPartner]);

    // 시간을 분:초 형식으로 변환
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-8 px-6 md:px-12 py-6 animate-in fade-in duration-700">

            {/* 상단 타이머 바 */}
            <div className="w-full max-w-4xl">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#FF4D94] animate-pulse" />
                        <span className="text-sm font-bold text-white/60 uppercase tracking-wider">
                            Partner {currentPartnerIndex + 1} / {totalPartners}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-[#FF4D94]" />
                        <span className="text-2xl font-black text-[#FF4D94] tabular-nums">
                            {formatTime(remainingTime)}
                        </span>
                    </div>
                </div>

                {/* 진행 바 */}
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-[#FF4D94] to-pink-400 transition-all duration-1000 ease-linear rounded-full"
                        style={{ width: `${(remainingTime / maxTime) * 100}%` }}
                    />
                </div>
            </div>

            {/* 메인 카드 영역 */}
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">

                {/* 나의 카드 */}
                <ParticipantCard
                    name="나"
                    isMe={true}
                />

                {/* 상대방 카드 */}
                <ParticipantCard
                    name={currentPartner.name}
                    isMe={false}
                    prefs={partnerPrefs} // 해시태그 전달
                    headerText={title} // 헤더 텍스트 전달
                />
            </div>

            {/* 하단 파트너 인디케이터 */}
            <div className="flex items-center gap-3">
                {partners.map((_, idx) => (
                    <div
                        key={idx}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${idx === currentPartnerIndex
                            ? 'bg-[#FF4D94] scale-125'
                            : idx < currentPartnerIndex
                                ? 'bg-white/40'
                                : 'bg-white/10'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};

interface ParticipantCardProps {
    name: string;
    isMe: boolean;
    prefs?: string[];
    headerText?: string;
}

const ParticipantCard: React.FC<ParticipantCardProps> = ({ name, isMe, prefs, headerText }) => {
    return (
        <div
            className={`relative w-full aspect-[3/4] rounded-3xl border-4 overflow-hidden transition-all duration-500 ${isMe
                ? 'border-white/10 bg-gradient-to-b from-gray-800 to-gray-900'
                : 'border-[#FF4D94]/50 bg-gradient-to-b from-gray-800 to-gray-900 shadow-[0_0_40px_rgba(255,77,148,0.3)]'
                }`}
        >
            {/* 실루엣 배경 */}
            <div className="absolute inset-0 flex items-center justify-center">
                <User
                    size={120}
                    className={`transition-opacity ${isMe ? 'opacity-10' : 'opacity-15'}`}
                    strokeWidth={1.5}
                />
            </div>

            {/* 상단 라벨 */}
            {/* 상단 라벨 */}
            <div className="absolute top-6 left-6 z-10 w-full pr-6">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${isMe ? 'bg-white/30' : 'bg-[#FF4D94] animate-pulse'}`} />
                        <span className="text-sm font-bold uppercase tracking-wider text-white/80">
                            {name}
                        </span>
                    </div>
                </div>
            </div>

            {/* 하단 취향 태그 (상대방만) */}
            {
                !isMe && prefs && prefs.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                        {/* 헤더 텍스트 (해시태그 바로 위) */}
                        {headerText && (
                            <p className="text-base md:text-lg font-bold text-white mb-2 px-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {headerText}
                            </p>
                        )}

                        <div className="flex flex-wrap gap-2 justify-start">
                            {prefs.map((pref, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1.5 text-sm md:text-base font-semibold text-white bg-[#FF4D94]/10 rounded-xl border border-[#FF4D94]/20"
                                >
                                    #{pref}
                                </span>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* 실루엣 오버레이 */}
            <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        </div>
    );
};
