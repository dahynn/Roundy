import React, { useState, useEffect, useRef } from 'react';
import { User, Heart } from 'lucide-react';

interface Participant {
    id: number;
    name: string;
    gender: 'MALE' | 'FEMALE';
    voteTo?: number; // 최종 선택 대상 ID
}

// Mock Data (최종 결과용)
const MOCK_FINAL_PARTICIPANTS: Participant[] = [
    { id: 1, name: '남자 1호', gender: 'MALE', voteTo: 6 }, // 1호 -> 3호 (커플!)
    { id: 2, name: '남자 2호', gender: 'MALE', voteTo: 4 },
    { id: 3, name: '남자 3호', gender: 'MALE', voteTo: 5 },
    { id: 4, name: '여자 1호', gender: 'FEMALE', voteTo: 2 },
    { id: 5, name: '여자 2호', gender: 'FEMALE', voteTo: 3 },
    { id: 6, name: '여자 3호', gender: 'FEMALE', voteTo: 1 }, // 3호 -> 1호 (커플!)
];

interface Step5_FinalResultProps {
    participants?: Participant[];
}

export const Step5_FinalResult: React.FC<Step5_FinalResultProps> = ({ participants = MOCK_FINAL_PARTICIPANTS }) => {
    const [maleArrowsVisible, setMaleArrowsVisible] = useState<number[]>([]);
    const [femaleArrowsVisible, setFemaleArrowsVisible] = useState<number[]>([]);
    const [matches, setMatches] = useState<number[]>([]); // 매칭된 커플 ID 쌍
    const [isReady, setIsReady] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
    const [, setTick] = useState(0);

    // ID 순서로 정렬
    const maleParticipants = participants
        .filter(p => p.gender === 'MALE')
        .sort((a, b) => a.id - b.id);
    const femaleParticipants = participants
        .filter(p => p.gender === 'FEMALE')
        .sort((a, b) => a.id - b.id);

    useEffect(() => {
        const initTimer = setTimeout(() => {
            setIsReady(true);
            setTick(t => t + 1);
        }, 500);

        const handleResize = () => setTick(t => t + 1);
        window.addEventListener('resize', handleResize);

        // 애니메이션 시퀀스
        const MALE_START = 800;
        const INTERVAL = 800; // 좀 더 천천히 (긴장감)
        const HOLD = 2000;

        // 1. 남자 선택 공개
        maleParticipants.forEach((_, idx) => {
            setTimeout(() => {
                setMaleArrowsVisible(prev => [...prev, idx]);
            }, MALE_START + (idx * INTERVAL));
        });

        // 2. 여자 선택 공개
        const femaleStart = MALE_START + (maleParticipants.length * INTERVAL) + HOLD;
        femaleParticipants.forEach((_, idx) => {
            setTimeout(() => {
                setFemaleArrowsVisible(prev => [...prev, idx]);
            }, femaleStart + (idx * INTERVAL));
        });

        // 3. 매칭 확인 (모든 화살표 공개 후)
        const checkMatchTime = femaleStart + (femaleParticipants.length * INTERVAL) + 1000;
        setTimeout(() => {
            // 양방향 매칭 찾기
            const newMatches: number[] = [];
            maleParticipants.forEach(m => {
                const targetId = m.voteTo;
                const target = femaleParticipants.find(f => f.id === targetId);
                if (target && target.voteTo === m.id) {
                    newMatches.push(m.id);
                    if (targetId) newMatches.push(targetId);
                }
            });
            setMatches(newMatches);
        }, checkMatchTime);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(initTimer);
        };
    }, []);

    return (
        <div className="w-full min-h-screen bg-black flex flex-col items-center justify-center p-10 overflow-hidden">

            {/* 타이틀 */}
            <div className="mb-12 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
                <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300 mb-4 drop-shadow-2xl">
                    Final Matching Result
                </h2>
                <p className="text-white/40 text-lg">
                    과연 커플이 탄생했을까요?
                </p>
            </div>

            <div
                ref={containerRef}
                className="relative grid grid-cols-[300px_1fr_300px] gap-x-10 w-full max-w-7xl mx-auto"
                style={{ minHeight: '600px' }}
            >
                {/* 왼쪽 (남자) */}
                <div className="flex flex-col justify-around gap-0 z-30">
                    {maleParticipants.map((p) => (
                        <ResultCard
                            key={p.id}
                            participant={p}
                            cardRef={(el: HTMLDivElement | null) => (cardRefs.current[p.id] = el)}
                            isMatched={matches.includes(p.id)}
                            side="left"
                        />
                    ))}
                </div>

                {/* 가운데 빈 공간 */}
                <div className="pointer-events-none" />

                {/* 오른쪽 (여자) */}
                <div className="flex flex-col justify-around gap-0 z-30">
                    {femaleParticipants.map((p) => (
                        <ResultCard
                            key={p.id}
                            participant={p}
                            cardRef={(el: HTMLDivElement | null) => (cardRefs.current[p.id] = el)}
                            isMatched={matches.includes(p.id)}
                            side="right"
                        />
                    ))}
                </div>

                {/* SVG 레이어 */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
                    <defs>
                        <marker id="arrow-final-male" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
                            <path d="M0,0 L4,2 L0,4" fill="#60A5FA" />
                        </marker>
                        <marker id="arrow-final-female" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
                            <path d="M0,0 L4,2 L0,4" fill="#F472B6" />
                        </marker>
                    </defs>

                    {isReady && maleParticipants.map((male, idx) => {
                        if (!maleArrowsVisible.includes(idx) || !male.voteTo) return null;
                        const isMatched = matches.includes(male.id);
                        return (
                            <ConnectionLine
                                key={`m-${male.id}`}
                                fromId={male.id}
                                toId={male.voteTo}
                                cardRefs={cardRefs.current}
                                containerRef={containerRef}
                                color={isMatched ? "#FF4D94" : "#60A5FA"} // 커플이면 핑크, 아니면 블루
                                width={isMatched ? 4 : 2}
                                opacity={isMatched ? 1 : 0.4} // 커플 강조
                                offsetYRatio={0.35}
                            />
                        );
                    })}

                    {isReady && femaleParticipants.map((female, idx) => {
                        if (!femaleArrowsVisible.includes(idx) || !female.voteTo) return null;
                        const isMatched = matches.includes(female.id);
                        return (
                            <ConnectionLine
                                key={`f-${female.id}`}
                                fromId={female.id}
                                toId={female.voteTo}
                                cardRefs={cardRefs.current}
                                containerRef={containerRef}
                                color={isMatched ? "#FF4D94" : "#F472B6"} // 커플이면 핑크
                                width={isMatched ? 4 : 2}
                                opacity={isMatched ? 1 : 0.4}
                                offsetYRatio={0.65}
                            />
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

// ------------------------------------------------------------
// [카드 컴포넌트]
// ------------------------------------------------------------
const ResultCard = ({ participant, cardRef, isMatched, side }: { participant: Participant, cardRef: any, isMatched: boolean, side: string }) => {
    return (
        <div
            ref={cardRef}
            className={`
                relative w-full h-16 flex items-center gap-3 px-4 rounded-2xl border transition-all duration-500
                ${isMatched
                    ? 'bg-[#FF4D94]/20 border-[#FF4D94] shadow-[0_0_30px_rgba(255,77,148,0.5)] scale-110 z-50'
                    : 'bg-[#1a1a1a] border-white/10 opacity-70'}
            `}
        >
            <div className="shrink-0 relative">
                <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-colors
                    ${isMatched ? 'bg-[#FF4D94] text-white' : 'bg-zinc-800 text-white/30'}
                `}>
                    <User size={20} />
                </div>
                {isMatched && (
                    <div className="absolute -top-2 -right-2 animate-bounce">
                        <Heart size={16} className="fill-[#FF4D94] text-[#FF4D94]" />
                    </div>
                )}
            </div>
            <h3 className={`text-lg font-bold flex-1 ${isMatched ? 'text-white' : 'text-white/60'}`}>
                {participant.name}
            </h3>
        </div>
    );
};

// ------------------------------------------------------------
// [선 그리기 컴포넌트]
// ------------------------------------------------------------
const ConnectionLine = ({
    fromId, toId, cardRefs, containerRef, color, width, opacity, offsetYRatio
}: { fromId: number, toId: number, cardRefs: any, containerRef: any, color: string, width: number, opacity: number, offsetYRatio: number }) => {
    const fromEl = cardRefs[fromId];
    const toEl = cardRefs[toId];
    const containerEl = containerRef.current;

    if (!fromEl || !toEl || !containerEl) return null;

    const cRect = containerEl.getBoundingClientRect();
    const fRect = fromEl.getBoundingClientRect();
    const tRect = toEl.getBoundingClientRect();

    const y1 = (fRect.top - cRect.top) + (fRect.height * offsetYRatio);
    const y2 = (tRect.top - cRect.top) + (tRect.height * offsetYRatio);

    const isFromLeft = (fRect.left - cRect.left) < (cRect.width / 2);
    const x1 = isFromLeft ? (fRect.left - cRect.left) + fRect.width : (fRect.left - cRect.left);
    const x2 = isFromLeft ? (tRect.left - cRect.left) : (tRect.left - cRect.left) + tRect.width;

    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    if (length === 0) return null;

    const arrowSize = 12;
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

    return (
        <>
            <style>{`
                @keyframes drawArrow-${fromId}-${toId} {
                    from { stroke-dashoffset: ${length}; }
                    to { stroke-dashoffset: 0; }
                }
            `}</style>

            <path
                d={`M ${x1} ${y1} L ${x2} ${y2}`}
                fill="none"
                stroke={color}
                strokeWidth={width}
                strokeLinecap="round"
                strokeDasharray={length}
                strokeDashoffset={length}
                style={{
                    animation: `drawArrow-${fromId}-${toId} 1s ease-out forwards`,
                    filter: `drop-shadow(0 0 4px ${color})`,
                    opacity: opacity,
                    transition: 'all 0.5s ease-in-out' // 매칭 시 강조 효과 transition
                }}
            />

            <polygon
                points={`0,-${arrowSize / 2} ${arrowSize},0 0,${arrowSize / 2}`}
                fill={color}
                transform={`translate(${x2}, ${y2}) rotate(${angle})`}
                style={{
                    opacity: 0,
                    animation: `fadeIn 0.1s ease-out 0.9s forwards`,
                    transition: 'all 0.5s ease-in-out'
                }}
            />
            <style>{`@keyframes fadeIn { to { opacity: ${opacity}; } }`}</style>
        </>
    );
};
