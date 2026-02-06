import React from 'react';
import { Check, User, Heart } from 'lucide-react';

interface Participant {
    id: number;
    name: string;
    gender: 'MALE' | 'FEMALE';
}

interface Step2_FirstVoteProps {
    participants: Participant[];
    currentUserGender: 'MALE' | 'FEMALE';
    selectedCard: number | null;
    onSelect: (id: number) => void;
}

export const Step2_FirstVote: React.FC<Step2_FirstVoteProps> = ({
    participants,
    currentUserGender,
    selectedCard,
    onSelect,
}) => {
    const votableParticipants = participants.filter(
        p => p.gender !== currentUserGender
    );

    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-10 px-6 animate-in fade-in duration-700">
            {/* 타이틀 영역 */}
            <div className="text-center space-y-2 relative z-10">
                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    당신의 <span className="text-[#FF4D94]">첫인상</span>을 선택하세요
                </h2>
                <p className="text-white/50 text-sm">
                    오직 느낌만으로, 가장 끌리는 한 사람
                </p>
            </div>

            {/* 카드 그리드 */}
            {votableParticipants.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 w-full max-w-5xl perspective-1000">
                    {votableParticipants.map((participant, idx) => (
                        <VoteCard
                            key={participant.id}
                            participant={participant}
                            number={idx + 1}
                            isSelected={selectedCard === participant.id}
                            onSelect={() => onSelect(participant.id)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-white/50 text-xl font-bold animate-pulse">
                    투표할 상대방이 없습니다. (참가자 대기 중...)
                </div>
            )}

            {/* 하단 선택 확인 메시지 */}
            <div className={`
                fixed bottom-10 left-1/2 -translate-x-1/2 
                transition-all duration-500 ease-out transform z-20
                ${selectedCard ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
            `}>
                <div className="flex items-center gap-3 px-8 py-4 bg-[#FF4D94] shadow-[0_0_30px_rgba(255,77,148,0.4)] rounded-full">
                    <Heart className="fill-white text-white animate-pulse" size={20} />
                    <span className="text-sm font-bold text-white tracking-wide">
                        선택 완료
                    </span>
                </div>
            </div>
        </div>
    );
};

interface VoteCardProps {
    participant: Participant;
    number: number;
    isSelected: boolean;
    onSelect: () => void;
}

const VoteCard: React.FC<VoteCardProps> = ({ participant, number, isSelected, onSelect }) => {
    return (
        <div
            onClick={onSelect}
            className={`
                group relative cursor-pointer w-full aspect-[3/4.2] rounded-[2.5rem]
                transition-all duration-500 ease-out overflow-hidden
                border border-white/5
                ${isSelected
                    ? 'scale-105 shadow-[0_0_60px_-15px_rgba(255,77,148,0.5)] ring-1 ring-[#FF4D94]/50'
                    : 'hover:scale-[1.02] hover:shadow-2xl hover:border-white/20'
                }
            `}
        >
            {/* 1. 배경 (Deep Dark) */}
            <div className={`absolute inset-0 transition-colors duration-700
                ${isSelected ? 'bg-[#150a10]' : 'bg-[#0a0a0a]'}
            `} />

            {/* 2. 워터마크 숫자 */}
            <div className={`
                absolute -right-4 top-10 font-black text-[12rem] leading-none opacity-5 select-none pointer-events-none
                transition-all duration-500
                ${isSelected ? 'text-[#FF4D94] translate-x-2' : 'text-white translate-x-0'}
            `}>
                {number}
            </div>

            {/* 3. 조명 효과 */}
            <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 opacity-80`} />

            {isSelected && (
                <div className="absolute inset-0 bg-gradient-to-tr from-[#FF4D94]/20 via-transparent to-transparent opacity-50 duration-500" />
            )}

            {/* 4. 컨텐츠 영역 */}
            <div className="relative h-full flex flex-col items-center justify-center p-8 z-10">

                {/* 아바타 컨테이너 */}
                <div className="relative mb-10 group-hover:transform group-hover:-translate-y-2 transition-transform duration-500">
                    {/* 선택 시 돌아가는 링 */}
                    {isSelected && (
                        <div className="absolute -inset-4 border-t border-r border-[#FF4D94]/50 rounded-full animate-spin duration-[3s]" />
                    )}
                    {isSelected && (
                        <div className="absolute -inset-4 border-b border-l border-[#FF4D94]/30 rounded-full animate-spin duration-[3s] direction-reverse" />
                    )}

                    {/* 아바타 본체 */}
                    <div className={`
                        w-36 h-36 rounded-full flex items-center justify-center
                        transition-all duration-500 relative overflow-hidden
                        ${isSelected
                            ? 'bg-gradient-to-br from-[#FF4D94]/20 to-transparent border border-[#FF4D94] shadow-[0_0_40px_rgba(255,77,148,0.3)]'
                            : 'bg-white/5 border border-white/10'
                        }
                    `}>
                        <User
                            size={56}
                            className={`transition-all duration-500 ${isSelected ? 'text-[#FF4D94] scale-110' : 'text-white/30'}`}
                            strokeWidth={1}
                        />
                    </div>
                </div>

                {/* 이름 및 하단 장식 */}
                <div className="flex flex-col items-center gap-8 w-full">
                    <h3 className={`
        text-3xl font-black tracking-tight transition-all duration-300
        ${isSelected
                            ? 'text-transparent bg-clip-text bg-gradient-to-r from-white via-[#FF4D94] to-white scale-110'
                            : 'text-white/90'
                        }
                    `}>
                        {participant.name}
                    </h3>

                    {/* 장식용 라인 */}
                    <div className={`
        h-[2px] rounded-full transition-all duration-500
        ${isSelected
                            ? 'w-16 bg-gradient-to-r from-transparent via-[#FF4D94] to-transparent opacity-100'
                            : 'w-8 bg-white/10 opacity-50 group-hover:w-12'
                        }
                    `} />
                </div>
                {/* 선택 체크마크 */}
                <div className={`
                    absolute top-6 right-6 transition-all duration-500 transform
                    ${isSelected ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-45'}
                `}>
                    <div className="w-10 h-10 rounded-full bg-[#FF4D94] flex items-center justify-center shadow-lg shadow-[#FF4D94]/40">
                        <Check className="text-white" size={20} strokeWidth={3} />
                    </div>
                </div>
            </div>
        </div>
    );
};