import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Settings, Mic, Video, LogOut, FastForward } from 'lucide-react';

// --- Hooks ---
import { useRotationSystem } from '../../hooks/meeting/useRotation';
import { useOpenVidu } from '../../hooks/meeting/useOpenVidu';

// --- Components ---
// Step 컴포넌트들을 components/rotation 폴더에서 불러옵니다.
import { Step1_Intro } from '../../components/rotation/Step1_Intro';
import { Step2_Vote } from '../../components/rotation/Step2_Vote';
import { Step3_Result } from '../../components/rotation/Step3_Result';
import { Step4_Talk } from '../../components/rotation/Step4_Talk';
// Step5_ImageGame removed
import { Step6_FinalResult } from '../../components/rotation/Step6_FinalResult';
import { Step7_FaceReveal } from '../../components/rotation/Step7_FaceReveal';
import { StepLoading_Preference } from '../../components/rotation/StepLoading_Preference';

// 로딩 화면 UI (RotationMeetingContainer의 WAITING 참고)
const StepWaiting = ({ count }: { count: number }) => (
    <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500">
        <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-[#FF4D94] animate-spin" />
        <div className="text-center">
            <h2 className="text-3xl font-bold mb-2 text-white">참가자 대기 중</h2>
            <p className="text-white/40">현재 {count}/4명 접속</p>
        </div>
    </div>
);

// --- Types ---
import type { GameAnswerPayload } from '../../types/meeting/rotaion';
import { useUser } from '@/context/UserContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function MeetingPage() {
    // --------------------------------------------------------------------------------
    // 1. 초기 설정 및 상태 관리 (Actual Logic)
    // --------------------------------------------------------------------------------
    const { userInfo, isLoading: isUserLoading } = useUser();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // URL 파라미터 확인 (roomId, token) -> 백엔드 연동 필수값
    // 예: /meeting?room=uuid&token=jwt...
    const roomId = searchParams.get('room') || searchParams.get('roomId');
    const token = searchParams.get('token');

    // 사용자 프로필 매핑 (UserContext -> Rotation System)
    const userProfile = useMemo(() => {
        if (!userInfo) return null;
        return {
            userId: userInfo.id,
            username: userInfo.name, // or nickname?
            nickname: userInfo.nickname,
            gender: (userInfo.gender || 'MALE') as 'MALE' | 'FEMALE', // Type casting or validation needed
            mode: 'PAIR_ONLY' as const // 일단 고정
        };
    }, [userInfo]);

    // Custom Hooks (Token 기반 연결)
    const { state: wsState, submitVote, submitGameAnswer, leaveRoom } = useRotationSystem(roomId, token, userProfile);
    const { publisher, subscribers, joinSession, leaveSession } = useOpenVidu();

    // 초기 진입 검증 (제거하거나 완화)
    // UserContext가 로딩 중일 때는 아무것도 하지 않음
    useEffect(() => {
        if (!isUserLoading && !userInfo && !roomId && !token) {
            // 토큰도 없고 유저 정보도 없으면 팅겨내기
            // alert("잘못된 접근입니다.");
            // window.location.href = '/home';
        }
    }, [isUserLoading, userInfo, roomId, token]);

    if (isUserLoading || !userProfile || !roomId || !token) {
        return (
            <div className="h-screen w-full bg-[#0F0F0F] flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-[#FF4D94] rounded-full animate-spin" />
                    <p>미팅 접속 중...</p>
                </div>
            </div>
        );
    }


    // Local UI State
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);
    const [selectedCard, setSelectedCard] = useState<number | null>(null);
    const [hasVoted, setHasVoted] = useState(false);

    // Notice & Typing Animation State (RotationMeetingContainer.tsx Logic)
    const [currentNotice, setCurrentNotice] = useState<string | null>(null);
    const [displayText, setDisplayText] = useState('');

    // --- Line Drawing State for Result ---
    const [lines, setLines] = useState<any[]>([]);
    const anchorRefs = useRef<(HTMLDivElement | null)[]>([]);
    const svgRef = useRef<SVGSVGElement>(null);
    const [resultSubStage, setResultSubStage] = useState<'MALE_SIDE' | 'FEMALE_SIDE' | null>(null);

    // --------------------------------------------------------------------------------
    // 2. 데이터 변환 및 Memoization
    // --------------------------------------------------------------------------------

    // UI용 참가자 데이터 매핑 (Stream 매핑 포함)
    const uiParticipants = useMemo(() => {
        return wsState.participants.map(p => {
            // Stream 매핑 조회
            let streamManager = null;
            let isLocal = false;

            // 1. 내 스트림인지 확인
            if (p.userId === userProfile.userId) {
                streamManager = publisher;
                isLocal = true;
            } else {
                // 2. 구독자 스트림에서 찾기
                const sub = subscribers.find(s => {
                    try {
                        const data = JSON.parse(s.stream.connection.data);
                        // username으로 매칭 (RotationTest 방식)
                        // 주의: 동명이인 등 식별 이슈가 있을 수 있으나 현재 로직 유지
                        return data.clientData === p.nickname;
                    } catch (e) {
                        return false;
                    }
                });
                if (sub) {
                    streamManager = sub;
                }
            }

            return {
                id: p.userId,
                name: p.nickname, // nickname vs username
                gender: p.gender,
                voteTo: 0,
                keywords: [],
                badges: [],
                streamManager, // 새로 추가된 필드
                isLocal
            };
        });
    }, [wsState.participants, subscribers, publisher, userProfile]);

    // UI용 상대방 파트너 데이터 매핑 및 Stream 찾기
    const uiPartner = useMemo(() => {
        if (!wsState.currentPartner) return null;

        let partnerStream = undefined;
        // 1:1 세션에서는 subscribers 배열에 상대방만 들어옴 (보통).
        // 하지만 안전하게 clientData로 찾기
        const sub = subscribers.find(s => {
            try {
                const data = JSON.parse(s.stream.connection.data);
                return data.clientData === wsState.currentPartner?.nickname;
            } catch { return false; }
        });
        // 만약 못 찾았는데 subscribers가 1개라면 그게 파트너일 확률 높음 (1:1 방)
        if (!partnerStream && subscribers.length > 0) partnerStream = subscribers[0];

        return {
            id: wsState.currentPartner.id || 0,
            name: wsState.currentPartner.nickname || 'Unknown',
            gender: userProfile.gender === 'MALE' ? 'FEMALE' : 'MALE',
            voteTo: 0,
            keywords: [],
            badges: [],
            stream: partnerStream // 파트너 스트림
        };
    }, [wsState.currentPartner, userProfile.gender, subscribers]);

    // 후보군 필터링 (나를 제외한 '이성'만 추출, 투표용)
    const candidates = useMemo(() => {
        return wsState.participants.filter(p => {
            if (p.userId === userProfile.userId) return false;
            if (!p.gender) return false;
            const myGender = String(userProfile.gender).toUpperCase();
            const targetGender = String(p.gender).toUpperCase();
            return myGender !== targetGender;
        });
    }, [wsState.participants, userProfile]);

    // 현재 발언자 인덱스 계산 (Step1_Intro 용)
    const activeSpeakerIdx = useMemo(() => {
        if (!wsState.currentSpeaker) return null;
        return uiParticipants.findIndex(p => p.id === wsState.currentSpeaker!.id);
    }, [wsState.currentSpeaker, uiParticipants]);


    // --------------------------------------------------------------------------------
    // 3. Side Effects (로직 처리)
    // --------------------------------------------------------------------------------

    // 세션 자동 접속 (OpenVidu)
    useEffect(() => {
        const partnerInfo = wsState.currentPartner;
        if (partnerInfo?.sessionId && partnerInfo?.token) {
            joinSession(partnerInfo.sessionId, partnerInfo.token, userProfile.username);
        }
    }, [wsState.currentPartner?.sessionId, wsState.currentPartner?.token, joinSession, userProfile.username]);

    // 마이크/카메라 토글 반영
    useEffect(() => {
        if (publisher) {
            publisher.publishAudio(isMicOn);
            publisher.publishVideo(isCamOn);
        }
    }, [isMicOn, isCamOn, publisher]);

    // 스테이지 변경 시 상태 초기화
    useEffect(() => {
        setHasVoted(false);
        setSelectedCard(null);

        // 스테이지별 안내 문구 설정
        const stage = wsState.currentStage;
        if (stage === 'VOTE_FIRST') setCurrentNotice('당신의 마음은 사로잡은 사람은?');
        else if (stage === 'VOTE_FINAL') setCurrentNotice('운명의 상대를 선택해주세요');
        else setCurrentNotice(null);

    }, [wsState.currentStage]);

    // 타이핑 애니메이션
    useEffect(() => {
        if (!currentNotice) {
            setDisplayText('');
            return;
        }
        let i = 0;
        setDisplayText('');
        const typing = setInterval(() => {
            if (i < currentNotice.length) {
                setDisplayText(currentNotice.substring(0, i + 1));
                i++;
            } else clearInterval(typing);
        }, 70);
        return () => clearInterval(typing);
    }, [currentNotice]);

    // 자동 선택 (타임아웃 방지)
    useEffect(() => {
        const isSelectionStage = ['VOTE_FIRST', 'VOTE_FINAL'].includes(wsState.currentStage);
        if (isSelectionStage && wsState.remainingTime <= 1 && !hasVoted) {
            console.warn("⏳ 시간 초과! 투표 미참여 처리 (null 전송)");
            handleChoice(null, true);
        }
    }, [wsState.remainingTime, hasVoted, wsState.currentStage]);

    // 매칭 결과 라인 드로잉 로직 (MATCHING_RESULT 단계)
    useEffect(() => {
        if (wsState.currentStage !== 'MATCHING_RESULT') {
            setLines([]);
            return;
        }

        // 약간의 지연 후 라인 그리기 (애니메이션 효과)
        const timer = setTimeout(() => {
            if (!svgRef.current) return;
            const svgRect = svgRef.current.getBoundingClientRect();
            const newLines: any[] = [];

            // 내 매칭 정보 확인
            const myId = userProfile.userId;
            const partnerId = wsState.currentPartner?.id;

            // 참가자 목록에서 인덱스 찾기
            const myIndex = uiParticipants.findIndex(p => p.id === myId);
            const partnerIndex = partnerId ? uiParticipants.findIndex(p => p.id === partnerId) : -1;

            if (myIndex !== -1 && partnerIndex !== -1 && anchorRefs.current[myIndex] && anchorRefs.current[partnerIndex]) {
                const startRect = anchorRefs.current[myIndex]!.getBoundingClientRect();
                const endRect = anchorRefs.current[partnerIndex]!.getBoundingClientRect();

                newLines.push({
                    id: `match-${myId}-${partnerId}`,
                    start: {
                        x: startRect.left + startRect.width / 2 - svgRect.left,
                        y: startRect.top + startRect.height / 2 - svgRect.top
                    },
                    end: {
                        x: endRect.left + endRect.width / 2 - svgRect.left,
                        y: endRect.top + endRect.height / 2 - svgRect.top
                    },
                    isReverse: false // 필요 시 로직 추가
                });
            }

            setLines(newLines);
        }, 500);

        return () => clearTimeout(timer);
    }, [wsState.currentStage, uiParticipants, userProfile.userId, wsState.currentPartner]);

    // --------------------------------------------------------------------------------
    // 4. 핸들러 함수
    // --------------------------------------------------------------------------------

    const handleChoice = (targetId: number | null, isAutoRandom = false) => {
        if (hasVoted && !isAutoRandom) return;

        console.log(`[Meeting] Choice: ${targetId} (Auto: ${isAutoRandom})`);

        if (wsState.currentStage === 'VOTE_FIRST' || wsState.currentStage === 'VOTE_FINAL') {
            // UI select 반영 (null이면 선택 취소 또는 유지)
            if (targetId !== null) setSelectedCard(targetId);
            submitVote(targetId);
            setHasVoted(true);
        }
    };

    const handleGoHome = () => {
        alert("홈으로 이동합니다!");
        window.location.href = '/';
    };

    const handleAgreeReveal = () => {
        // 얼굴 공개 동의 로직
        console.log("얼굴 공개 동의");
    };

    // 리다이렉트/퇴장 알림 (가이드 준수)
    if (wsState.redirectInfo) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white animate-in fade-in">
                <div className="text-4xl font-bold mb-4">🚪 알림</div>
                <p className="text-xl text-white/70 whitespace-pre-wrap text-center mb-8">{wsState.redirectInfo.message}</p>
                <div className="text-2xl font-mono text-[#FF4D94]">
                    {wsState.redirectInfo.remainingSeconds}초 후 홈으로 이동합니다...
                </div>
            </div>
        );
    }

    // --------------------------------------------------------------------------------
    // 5. 렌더링 로직 (RotationMeetingContainer.tsx UI)
    // --------------------------------------------------------------------------------

    return (
        <div className="h-screen w-full bg-[#0F0F0F] text-white flex flex-col font-['Pretendard'] overflow-hidden selection:bg-[#FF4D94] selection:text-white">

            {/* --- Header --- */}
            <header className="flex items-center justify-between px-8 py-6 z-30">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#FF4D94] rounded-xl rotate-12 flex items-center justify-center shadow-[0_0_15px_rgba(255,77,148,0.5)]">
                        <div className="w-3 h-3 bg-white rounded-full" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#FF4D94] uppercase tracking-[0.2em] leading-tight">Rotation</span>
                        <span className="text-xl font-black text-white leading-none">Meeting</span>
                    </div>
                </div>

                {/* Status Indicator Pill */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-2 rounded-full shadow-2xl">
                    <div className={`w-2 h-2 rounded-full ${wsState.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-sm font-bold text-white/80 uppercase mr-4">
                        {wsState.currentStage.replace(/_/g, ' ')}
                    </span>
                    <div className="w-px h-4 bg-white/10" />
                    <span className="text-2xl font-black text-[#FF4D94] tabular-nums w-[80px] text-center">
                        {Math.floor(wsState.remainingTime / 60).toString().padStart(2, '0')}:
                        {(wsState.remainingTime % 60).toString().padStart(2, '0')}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <button className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all hover:scale-105 active:scale-95">
                        <Settings size={20} className="text-white/60" />
                    </button>
                    <button
                        onClick={() => leaveRoom()}
                        className="flex items-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-2xl transition-all group">
                        <LogOut size={18} className="text-red-500 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-bold text-red-500 uppercase">Exit</span>
                    </button>
                </div>
            </header>

            {/* --- Main Content Area --- */}
            <main className="flex-1 w-full relative flex flex-col items-center justify-center p-8 overflow-hidden">
                {/* Background Ambient */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#FF4D94] rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />

                {currentNotice ? (
                    <div className="absolute inset-0 flex items-center justify-center z-50 bg-[#0F0F0F]/80 backdrop-blur-sm animate-in fade-in duration-300">
                        <h2 className="text-4xl md:text-6xl font-black text-white text-center leading-tight drop-shadow-2xl">
                            {displayText}
                            <span className="animate-pulse text-[#FF4D94]">_</span>
                        </h2>
                    </div>
                ) : (
                    <div className="w-full max-w-[1600px] h-full flex items-center justify-center relative z-10">

                        {/* WAITING */}
                        {wsState.currentStage === 'WAITING' && (
                            <StepWaiting count={wsState.participants.length} />
                        )}

                        {/* INTRO */}
                        {wsState.currentStage === 'SELF_INTRO' && (
                            <Step1_Intro
                                participants={uiParticipants}
                                activeSpeakerIdx={activeSpeakerIdx} // 발언자 인덱스 연결
                            />
                        )}

                        {/* VOTE_1 (첫인상) */}
                        {wsState.currentStage === 'VOTE_FIRST' && (
                            <Step2_Vote
                                participants={uiParticipants}
                                currentUser={userProfile}
                                selectedCard={selectedCard}
                                onSelect={handleChoice} // 직접 선택 핸들러 연결
                            />
                        )}

                        {/* ROTATION (Short/Long) & TALK */}
                        {(wsState.currentStage === 'ROTATION_SHORT' || wsState.currentStage === 'ROTATION_LONG') && uiPartner && (
                            <Step4_Talk
                                partner={uiPartner}
                                currentUser={userProfile}
                                showCards={wsState.currentStage === 'ROTATION_LONG'}
                                partnerStream={uiPartner.stream}
                                myStream={publisher}
                            />
                        )}

                        {/* IMAGE GAME REMOVED */}

                        {/* VOTE_FINAL (최종 선택) */}
                        {wsState.currentStage === 'VOTE_FINAL' && (
                            <Step2_Vote
                                participants={uiParticipants}
                                currentUser={userProfile}
                                selectedCard={selectedCard}
                                onSelect={handleChoice}
                            />
                        )}

                        {/* FINAL RESULT */}
                        {wsState.currentStage === 'MATCHING_RESULT' && (
                            <Step3_Result
                                participants={uiParticipants}
                                resultSubStage={resultSubStage}
                                anchorRefs={anchorRefs}
                                svgRef={svgRef}
                                lines={lines}
                            />
                        )}

                        {/* FACE REVEAL (매칭 성공 후) */}
                        {wsState.currentStage === 'FACE_REVEAL' && uiPartner && (
                            <Step7_FaceReveal
                                myInfo={userProfile}
                                partnerInfo={uiPartner}
                                onGoHome={handleGoHome}
                            />
                        )}

                    </div>
                )}
            </main>

            {/* --- Footer / Controls --- */}
            <footer className="w-full px-8 pb-8 pt-4 flex justify-between items-end z-30">
                <div className="flex gap-2">
                </div>

                <div className="bg-[#1A1A1A]/80 backdrop-blur-2xl border border-white/10 rounded-[32px] p-2 pr-8 flex items-center gap-6 shadow-2xl hover:border-white/20 transition-all">
                    <div className="flex gap-2 p-2 rounded-[24px] bg-black/20">
                        <button
                            onClick={() => setIsMicOn(!isMicOn)}
                            className={`w-14 h-14 rounded-[20px] flex items-center justify-center transition-all ${isMicOn ? 'bg-white text-black shadow-lg scale-100' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                        >
                            <Mic size={24} strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={() => setIsCamOn(!isCamOn)}
                            className={`w-14 h-14 rounded-[20px] flex items-center justify-center transition-all ${isCamOn ? 'bg-white text-black shadow-lg scale-100' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                        >
                            <Video size={24} strokeWidth={2.5} />
                        </button>
                    </div>

                    <div className="flex flex-col items-start min-w-[120px]">
                        <span className="text-[10px] font-bold text-[#FF4D94] uppercase tracking-widest mb-0.5">My Profile</span>
                        <span className="text-lg font-black text-white uppercase tracking-tight">{userProfile.username}</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
