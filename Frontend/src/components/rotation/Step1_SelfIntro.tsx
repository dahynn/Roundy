import React, { useMemo } from 'react';
import { User, Mic, Sparkles } from 'lucide-react';
import { StreamManager } from 'openvidu-browser';
import UserVideo from '../meeting/UserVideo';

interface Participant {
    id: number;
    name: string;
    gender: 'MALE' | 'FEMALE';
    streamManager?: StreamManager | null; // 추가
    isLocal?: boolean; // 추가
}

interface Step1_SelfIntroProps {
    participants: Participant[];
    activeSpeakerIdx: number | null;
}

export const Step1_SelfIntro: React.FC<Step1_SelfIntroProps> = ({
    participants,
    activeSpeakerIdx,
}) => {
    return (
        <div className="w-full min-h-full flex flex-col items-center justify-start md:justify-center gap-8 px-4 md:px-12 py-6 animate-in fade-in duration-1000 overflow-y-auto">

            {/* 상단: 남자 참가자 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-7xl perspective-1000">
                {participants.slice(0, 3).map((p, idx) => (
                    <SpeakerCard
                        key={p.id}
                        participant={p}
                        isActive={activeSpeakerIdx === idx}
                        speakerNumber={idx + 1}
                    />
                ))}
            </div>

            {/* 구분선 (Visual Divider) - 선택 사항 */}
            <div className="w-full max-w-xs h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* 하단: 여자 참가자 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-7xl perspective-1000">
                {participants.slice(3, 6).map((p, idx) => (
                    <SpeakerCard
                        key={p.id}
                        participant={p}
                        isActive={activeSpeakerIdx === idx + 3}
                        speakerNumber={idx + 1}
                    />
                ))}
            </div>

            {/* CSS for Audio Wave Animation */}
            <style>{`
                @keyframes bounce {
                    0%, 100% { height: 10%; }
                    50% { height: 100%; }
                }
                .audio-bar {
                    animation: bounce 1s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
};

interface SpeakerCardProps {
    participant: Participant;
    isActive: boolean;
    speakerNumber: number;
}

const SpeakerCard: React.FC<SpeakerCardProps> = ({ participant, isActive, speakerNumber }) => {
    return (
        <div
            className={`
                relative w-full aspect-[16/9] md:aspect-[16/10] rounded-[2rem] 
                transition-all duration-700 ease-out overflow-hidden group
                ${isActive
                    ? 'scale-105 z-10 shadow-[0_0_50px_-10px_rgba(255,77,148,0.5)] ring-1 ring-[#FF4D94]/50'
                    : 'scale-95 opacity-40 grayscale hover:opacity-60 hover:scale-95 hover:grayscale-0'
                }
            `}
        >
            {/* 배경 (Background Layer) */}
            <div className={`absolute inset-0 transition-colors duration-700 
                ${isActive ? 'bg-[#1a1a2e]' : 'bg-black/80'}`}
            />

            {/* 비디오 렌더링 (Video Component) - 최우선 렌더링 */}
            {participant.streamManager && (
                <div className="absolute inset-0 z-0">
                    <UserVideo streamManager={participant.streamManager} isLocal={participant.isLocal} />
                </div>
            )}

            {/* 활성 상태일 때 배경 그라데이션 효과 (Spotlight) - 비디오 위에 살짝 얹기 */}
            {isActive && (
                <div className="absolute inset-0 bg-gradient-to-tr from-[#FF4D94]/20 via-transparent to-blue-500/10 opacity-60 pointer-events-none z-10" />
            )}

            {/* 컨텐츠 컨테이너 */}
            <div className="relative w-full h-full flex flex-col items-center justify-center">

                {/* 실루엣 아이콘 (비디오 없을 때만 표시) */}
                {!participant.streamManager && (
                    <div className={`relative transition-all duration-700 ${isActive ? 'translate-y-[-10%]' : 'translate-y-0'}`}>
                        <div className={`
                            relative z-10 p-6 rounded-full border border-white/5 
                            ${isActive ? 'bg-white/5 backdrop-blur-md' : 'bg-transparent'}
                        `}>
                            <User
                                size={isActive ? 64 : 48}
                                className={`transition-all duration-700 ${isActive ? 'text-white' : 'text-white/30'}`}
                                strokeWidth={1}
                            />
                        </div>

                        {/* 활성 상태일 때 뒤쪽 글로우 */}
                        {isActive && (
                            <div className="absolute inset-0 bg-[#FF4D94] blur-[40px] opacity-40 animate-pulse" />
                        )}
                    </div>
                )}

                {/* 오디오 비주얼라이저 (말하고 있다는 시각적 표현) */}
                {isActive && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8">
                        <div className="w-1 bg-[#FF4D94] rounded-full audio-bar" style={{ animationDelay: '0.0s' }} />
                        <div className="w-1 bg-[#FF4D94] rounded-full audio-bar" style={{ animationDelay: '0.2s' }} />
                        <div className="w-1 bg-[#FF4D94] rounded-full audio-bar" style={{ animationDelay: '0.4s' }} />
                        <div className="w-1 bg-[#FF4D94] rounded-full audio-bar" style={{ animationDelay: '0.1s' }} />
                        <div className="w-1 bg-[#FF4D94] rounded-full audio-bar" style={{ animationDelay: '0.3s' }} />
                    </div>
                )}
            </div>

            {/* 상단 라벨 (Gender & Number) */}
            <div className="absolute top-5 left-6 flex items-center gap-2">
                <span className={`
                    text-xs font-medium tracking-[0.2em] uppercase 
                    ${isActive ? 'text-[#FF4D94]' : 'text-white/30'}
                `}>
                    {participant.gender === 'MALE' ? 'MALE' : 'FEMALE'} 0{speakerNumber}
                </span>
            </div>

            {/* 상태 배지 (ON AIR) */}
            <div className={`
                absolute top-5 right-6 flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-black/20 backdrop-blur-sm
                transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}
            `}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF4D94] animate-ping" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF4D94] absolute" />
                <span className="text-[10px] font-bold text-white tracking-widest ml-1">ON AIR</span>
            </div>

            {/* 테두리 그라데이션 (Border Gradient) */}
            <div className={`
                absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none
                ${isActive ? 'border-none ring-1 ring-[#FF4D94]/30' : ''}
            `} />
        </div>
    );
};