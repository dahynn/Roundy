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

interface VoteResultItem {
    voterId: number;
    voterNickname?: string; // [NEW] Payload fallbacks
    targetId: number | null;
    targetNickname?: string; // [NEW] Payload fallbacks
}

interface Step2_ResultProps {
    participants: Participant[];
    results?: VoteResultItem[] | null;
}

export const Step2_Result: React.FC<Step2_ResultProps> = ({ participants, results }) => {
    const [maleArrowsVisible, setMaleArrowsVisible] = useState<number[]>([]);
    const [femaleArrowsVisible, setFemaleArrowsVisible] = useState<number[]>([]);

    // isReady: 애니메이션 준비 여부. results가 들어오면 true로 설정
    const [isReady, setIsReady] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
    const [, setTick] = useState(0);

    // [FIX] 결과 Payload에 있는 닉네임을 우선 사용하도록 데이터 보정
    // participants 목록에 있는 정보가 최신이 아니거나 비동기 이슈가 있을 수 있음
    const displayParticipants = React.useMemo(() => {
        if (!results) return participants;
        return participants.map(p => {
            const vote = results.find(r => r.voterId === p.id);
            if (vote && vote.voterNickname) {
                return { ...p, name: vote.voterNickname };
            }
            return p;
        });
    }, [participants, results]);

    // ID 순서로 정렬 (보정된 데이터 사용)
    const maleParticipants = displayParticipants
        .filter(p => p.gender === 'MALE')
        .sort((a, b) => a.id - b.id);
    const femaleParticipants = displayParticipants
        .filter(p => p.gender === 'FEMALE')
        .sort((a, b) => a.id - b.id);

    // 투표 결과 매핑 (voterId -> targetId)
    const voteMap = useRef<Map<number, number | null>>(new Map());

    useEffect(() => {
        if (results) {
            voteMap.current.clear();
            results.forEach(r => voteMap.current.set(r.voterId, r.targetId));
            setIsReady(true);
        }
    }, [results]);

    useEffect(() => {
        if (!isReady) return;

        const handleResize = () => setTick(t => t + 1);
        window.addEventListener('resize', handleResize);

        // ------------------------------------------------------------
        // [타이밍 로직] Step 2 전용: 남자 -> 5초 대기 -> 여자
        // ------------------------------------------------------------
        const MALE_START = 800;
        const INTERVAL = 800;
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

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [isReady, maleParticipants.length, femaleParticipants.length]);

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
                            isMatched={false} // Step 2는 매칭 결과가 아님
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
                            isMatched={false} // Step 2는 매칭 결과가 아님
                            side="right"
                        />
                    ))}
                </div>

                {/* SVG 레이어 */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">

                    {/* 남자 화살표 */}
                    {isReady && maleParticipants.map((male, idx) => {
                        if (!maleArrowsVisible.includes(idx)) return null;
                        const targetId = voteMap.current.get(male.id);

                        // 기권 (null) 이면 X 표시 혹은 짧은 끊긴 화살표 (여기선 미표시 혹은 다른 처리)
                        // 요구사항: "화살표를 포기한 것처럼 구성해" -> 투명도 낮거나, 중간에 끊기거나.
                        // ConnectionLine에 isGiveUp prop 추가하여 처리

                        // 만약 targetId가 없거나(기권), 해당 타겟이 femaleParticipants에 없으면 기권 처리
                        const isGiveUp = !targetId || !femaleParticipants.find(f => f.id === targetId);

                        // 기권 시각화: 자신의 카드 근처에서 소멸되거나 X 표시
                        // 여기서는 targetId가 없으므로 toId를 자기 자신으로 하거나, ConnectionLine 내부에서 처리

                        return (
                            <ConnectionLine
                                key={`m-${male.id}`}
                                fromId={male.id}
                                toId={targetId || male.id} // 기권일 경우 자기 자신 ID (내부 패딩을 이용해 처리) or null handling
                                cardRefs={cardRefs.current}
                                containerRef={containerRef}
                                color="#60A5FA" // Blue
                                width={2}
                                opacity={isGiveUp ? 0.3 : 1}
                                offsetYRatio={0.35} // 위쪽
                                isGiveUp={isGiveUp} // [API change needs to be propagated to Component]
                            />
                        );
                    })}

                    {/* 여자 화살표 */}
                    {isReady && femaleParticipants.map((female, idx) => {
                        if (!femaleArrowsVisible.includes(idx)) return null;
                        const targetId = voteMap.current.get(female.id);
                        const isGiveUp = !targetId || !maleParticipants.find(m => m.id === targetId);

                        return (
                            <ConnectionLine
                                key={`f-${female.id}`}
                                fromId={female.id}
                                toId={targetId || female.id}
                                cardRefs={cardRefs.current}
                                containerRef={containerRef}
                                color="#F472B6" // Pink
                                width={2}
                                opacity={isGiveUp ? 0.3 : 1}
                                offsetYRatio={0.65} // 아래쪽
                                isGiveUp={isGiveUp}
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
// ------------------------------------------------------------
// [ConnectionLine] Step 5와 100% 동일한 코드 (Path + Polygon)
// ------------------------------------------------------------
const ConnectionLine = ({
    fromId, toId, cardRefs, containerRef, color, width, opacity, offsetYRatio, isGiveUp
}: { fromId: number, toId: number, cardRefs: any, containerRef: any, color: string, width: number, opacity: number, offsetYRatio: number, isGiveUp?: boolean }) => {
    const fromEl = cardRefs[fromId];
    const toEl = cardRefs[toId];
    const containerEl = containerRef.current;

    if (!fromEl || !containerEl) return null; // toEl is optional if giveup? No, we used self ID.

    const cRect = containerEl.getBoundingClientRect();
    const fRect = fromEl.getBoundingClientRect();
    // 기권일 경우 toEl은 자기 자신이므로 좌표 계산이 0이 됨 -> 이를 이용해 짧게 끊거나 X 표시
    const tRect = toEl ? toEl.getBoundingClientRect() : fRect;

    const y1 = (fRect.top - cRect.top) + (fRect.height * offsetYRatio);
    // 기권이면 y2를 조금만 이동
    const y2 = isGiveUp
        ? y1
        : (tRect.top - cRect.top) + (tRect.height * offsetYRatio);

    const isFromLeft = (fRect.left - cRect.left) < (cRect.width / 2);
    const x1 = isFromLeft ? (fRect.left - cRect.left) + fRect.width : (fRect.left - cRect.left);

    // 기권이면 x2를 중앙쪽으로 조금만 뻗음 (50px)
    const x2 = isGiveUp
        ? (isFromLeft ? x1 + 50 : x1 - 50)
        : (isFromLeft ? (tRect.left - cRect.left) : (tRect.left - cRect.left) + tRect.width);

    // 거리 계산
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

            {/* 메인 라인 */}
            <path
                d={`M ${x1} ${y1} L ${x2} ${y2}`}
                fill="none"
                stroke={isGiveUp ? '#666' : color} // 기권은 회색
                strokeWidth={width}
                strokeLinecap="round"
                strokeDasharray={isGiveUp ? '4 4' : length} // 기권은 점선
                strokeDashoffset={isGiveUp ? 0 : length} // 점선은 애니메이션 다르게? 일단 그냥 둠
                style={{
                    animation: isGiveUp ? 'none' : `drawArrow-${fromId}-${toId} 1s ease-out forwards`,
                    filter: isGiveUp ? 'none' : `drop-shadow(0 0 4px ${color})`,
                    opacity: opacity,
                    transition: 'all 0.5s ease-in-out'
                }}
            />

            {/* 끝점 아이콘 (기권이면 X, 아니면 화살표) */}
            {isGiveUp ? (
                <text
                    x={x2}
                    y={y2}
                    fill="#666"
                    fontSize="16"
                    fontWeight="bold"
                    alignmentBaseline="middle"
                    textAnchor="middle"
                    style={{
                        opacity: 0,
                        animation: `fadeIn 0.1s ease-out 0.5s forwards`
                    }}
                >
                    X
                </text>
            ) : (
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
            )}
            <style>{`@keyframes fadeIn { to { opacity: ${opacity}; } }`}</style>
        </>
    );
};