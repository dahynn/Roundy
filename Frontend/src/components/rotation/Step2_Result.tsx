import React, { useState, useEffect, useRef } from 'react';
import { User, Heart } from 'lucide-react';

interface Participant {
    id: number;
    name: string;
    gender: 'MALE' | 'FEMALE';
    voteTo?: number; // 최종 선택 대상 ID
}

// Mock Data (Step 2용 데이터)
const MOCK_PARTICIPANTS: Participant[] = [
    { id: 1, name: '남자 1호', gender: 'MALE', voteTo: 6 },
    { id: 2, name: '남자 2호', gender: 'MALE', voteTo: 4 },
    { id: 3, name: '남자 3호', gender: 'MALE', voteTo: 5 },
    { id: 4, name: '여자 1호', gender: 'FEMALE', voteTo: 2 },
    { id: 5, name: '여자 2호', gender: 'FEMALE', voteTo: 2 },
    { id: 6, name: '여자 3호', gender: 'FEMALE', voteTo: 1 },
];

interface Step2_ResultProps {
    participants?: Participant[];
}

export const Step2_Result: React.FC<Step2_ResultProps> = ({ participants = MOCK_PARTICIPANTS }) => {
    const [maleArrowsVisible, setMaleArrowsVisible] = useState<number[]>([]);
    const [femaleArrowsVisible, setFemaleArrowsVisible] = useState<number[]>([]);

    // Step 2에서는 매칭 결과를 보여주지 않으므로 빈 배열 상태 유지 (구조 통일을 위해 변수는 남김)
    const [matches, setMatches] = useState<number[]>([]);
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

        // ------------------------------------------------------------
        // [타이밍 로직] Step 2 전용: 남자 -> 7초 대기 -> 여자
        // ------------------------------------------------------------
        const MALE_START = 800;
        const INTERVAL = 800;
        const HOLD = 2000; // 임시: 2초로 줄임 (원래 7000)

        // 1. 남자 선택 공개
        maleParticipants.forEach((_, idx) => {
            setTimeout(() => {
                console.log(`Male arrow ${idx} visible`);
                setMaleArrowsVisible(prev => [...prev, idx]);
            }, MALE_START + (idx * INTERVAL));
        });

        // 2. 여자 선택 공개 (남자 종료 후 + 7초)
        const femaleStart = MALE_START + (maleParticipants.length * INTERVAL) + HOLD;
        console.log(`Female arrows will start at: ${femaleStart}ms`);
        femaleParticipants.forEach((_, idx) => {
            setTimeout(() => {
                console.log(`Female arrow ${idx} visible`);
                setFemaleArrowsVisible(prev => [...prev, idx]);
            }, femaleStart + (idx * INTERVAL));
        });

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(initTimer);
        };
    }, []);

    return (
        <div className="w-full h-full bg-transparent flex flex-col items-center justify-center p-10 overflow-hidden">

            {/* 타이틀 (Step 5 스타일 유지) */}
            <div className="mb-12 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
                <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300 mb-4 drop-shadow-2xl">
                    Heart Signal Result
                </h2>
                <p className="text-white/40 text-lg">
                    설레는 첫 번째 선택의 결과는?
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
                            isMatched={matches.includes(p.id)} // Step 2는 항상 false
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
                            isMatched={matches.includes(p.id)} // Step 2는 항상 false
                            side="right"
                        />
                    ))}
                </div>

                {/* SVG 레이어 */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">

                    {/* 남자 화살표 */}
                    {isReady && maleParticipants.map((male, idx) => {
                        if (!maleArrowsVisible.includes(idx) || !male.voteTo) return null;
                        const isMatched = matches.includes(male.id); // 항상 false
                        return (
                            <ConnectionLine
                                key={`m-${male.id}`}
                                fromId={male.id}
                                toId={male.voteTo}
                                cardRefs={cardRefs.current}
                                containerRef={containerRef}
                                color="#60A5FA" // Blue
                                width={2}
                                opacity={1}
                                offsetYRatio={0.35} // 위쪽
                            />
                        );
                    })}

                    {/* 여자 화살표 */}
                    {isReady && femaleParticipants.map((female, idx) => {
                        if (!femaleArrowsVisible.includes(idx) || !female.voteTo) return null;
                        const isMatched = matches.includes(female.id); // 항상 false
                        return (
                            <ConnectionLine
                                key={`f-${female.id}`}
                                fromId={female.id}
                                toId={female.voteTo}
                                cardRefs={cardRefs.current}
                                containerRef={containerRef}
                                color="#F472B6" // Pink
                                width={2}
                                opacity={1}
                                offsetYRatio={0.65} // 아래쪽
                            />
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

// ------------------------------------------------------------
// [ResultCard] Step 5와 100% 동일한 코드
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
// [ConnectionLine] Step 5와 100% 동일한 코드 (Path + Polygon)
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
                    transition: 'all 0.5s ease-in-out'
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