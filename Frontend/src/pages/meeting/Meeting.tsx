import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Settings, Mic, Video, LogOut, FastForward } from 'lucide-react';

// --- Hooks ---
import { useRotationSystem } from '../../hooks/meeting/useRotation';
import { useOpenVidu } from '../../hooks/meeting/useOpenVidu';

// --- Components ---
// Step 컴포넌트들을 components/rotation 폴더에서 불러옵니다.
import { Step1_SelfIntro as Step1_Intro } from '../../components/rotation/Step1_SelfIntro'; // Fixed Import
import { Step2_FirstVote as Step2_Vote } from '../../components/rotation/Step2_FirstVote';
import { Step2_Result } from '../../components/rotation/Step2_Result';
import { Step3_Talk } from '../../components/rotation/Step3_Talk';
import { Step4_Talk } from '../../components/rotation/Step4_Talk';
import { Step5_FinalVote } from '../../components/rotation/Step5_FinalVote';
import { Step5_FinalResult } from '../../components/rotation/Step5_FinalResult';
import { Step6_MatchSuccess } from '../../components/rotation/Step6_MatchSuccess';
import { Step6_NoMatch } from '../../components/rotation/Step6_NoMatch';
import { Step7_FaceReveal } from '../../components/rotation/Step7_FaceReveal';
import { Step7_MessageRoom } from '../../components/rotation/Step7_MessageRoom';

// 로딩 화면 UI
const StepWaiting = ({ count }: { count: number }) => (
    <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500">
        <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-[#FF4D94] animate-spin" />
        <div className="text-center">
            <h2 className="text-3xl font-bold mb-2 text-white">참가자 대기 중</h2>
            <p className="text-white/40">현재 {count}/6명 접속</p>
        </div>
    </div>
);

// --- Types ---
import { useUser } from '@/context/UserContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function MeetingPage() {
    // --------------------------------------------------------------------------------
    // 1. 초기 설정 및 상태 관리
    // --------------------------------------------------------------------------------
    const { userInfo, isLoading: isUserLoading } = useUser();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // URL 파라미터 확인 (roomId만) -> 토큰은 localStorage에서
    const roomId = searchParams.get('room') || searchParams.get('roomId');
    // const token = searchParams.get('token'); // 제거 (localStorage 사용)
    const token = localStorage.getItem('accessToken');

    // 사용자 프로필 매핑 (UserContext -> Rotation System)
    const userProfile = useMemo(() => {
        if (!userInfo) return null;
        return {
            userId: userInfo.id,
            username: userInfo.name, // or nickname?
            // nickname: userInfo.nickname, // useRotation UserProfile에 nickname 없음, username만 사용하거나 수정 필요
            gender: (userInfo.gender || 'MALE') as 'MALE' | 'FEMALE',
            mode: 'PAIR_ONLY' as const
        };
    }, [userInfo]);

    // Custom Hooks
    // useRotationSystem에서 nickname을 username으로 사용하는지 확인 필요
    // 현재 hook 정의: interface UserProfile { userId, username, ... }
    const { state: wsState, submitVote, submitGameAnswer, leaveRoom } = useRotationSystem(roomId, token, userProfile);
    const { publisher, subscribers, joinSession, leaveSession } = useOpenVidu();

    // 초기 진입 검증
    useEffect(() => {
        if (!isUserLoading && !userInfo) {
            // alert("로그인이 필요합니다."); // 필요 시 주석 해제
            // window.location.href = '/home';
        }
    }, [isUserLoading, userInfo]);

    if (!userProfile || !roomId || !token) {
        return (
            <div className="h-screen w-full bg-[#0F0F0F] flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-[#FF4D94] rounded-full animate-spin" />
                    <p>미팅 접속 중... {isUserLoading ? '(유저 정보 로딩)' : ''}</p>
                </div>
            </div>
        );
    }


    // Local UI State
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);
    const [selectedCard, setSelectedCard] = useState<number | null>(null);
    const [hasVoted, setHasVoted] = useState(false);

    // Notice & Typing Animation State
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

    // UI용 참가자 데이터 매핑
    const uiParticipants = useMemo(() => {
        return wsState.participants.map(p => {
            // Debugging Logs
            // console.log(`[UI] Mapping participant: ${p.nickname} (ID: ${p.userId})`);

            // Stream 매핑
            let streamManager = null;
            let isLocal = false;

            if (p.userId === userProfile.userId) {
                streamManager = publisher;
                isLocal = true;
            } else {
                // 구독자 스트림 찾기
                const sub = subscribers.find(s => {
                    try {
                        const data = JSON.parse(s.stream.connection.data);
                        // console.log(`  - Sub: ${data.clientData} vs Target: ${p.nickname}`);
                        if (data.clientData === p.nickname) return true;

                        // Fallback: serverData or other fields?
                        return false;
                    } catch (e) {
                        console.warn("Stream data parse error:", s.stream.connection.data);
                        return false;
                    }
                });
                if (sub) {
                    streamManager = sub;
                }
            }

            return {
                id: p.userId,
                name: p.nickname,
                gender: p.gender,
                voteTo: 0, // 백엔드에서 공개 안하면 알 수 없음
                keywords: [],
                badges: [],
                streamManager,
                isLocal
            };
        });
    }, [wsState.participants, subscribers, publisher, userProfile]);

    // UI용 상대방 파트너 데이터 매핑
    const uiPartner = useMemo(() => {
        if (!wsState.currentPartner) return null;

        let partnerStream = undefined;
        // 파트너 스트림 찾기
        const sub = subscribers.find(s => {
            const rawData = s.stream.connection.data;
            let clientData = rawData;
            try {
                const parsed = JSON.parse(rawData);
                if (parsed && parsed.clientData) clientData = parsed.clientData;
            } catch { }

            return clientData === wsState.currentPartner?.nickname;
        });
        if (!partnerStream && subscribers.length > 0) partnerStream = subscribers[0];

        return {
            id: wsState.currentPartner.id || 0,
            name: wsState.currentPartner.nickname || 'Unknown',
            gender: userProfile.gender === 'MALE' ? 'FEMALE' : 'MALE',
            voteTo: 0,
            keywords: [],
            badges: [],
            stream: partnerStream
        };
    }, [wsState.currentPartner, userProfile.gender, subscribers]);

    // 현재 발언자 인덱스 계산 (Step1_Intro 용)
    const activeSpeakerIdx = useMemo(() => {
        if (!wsState.currentSpeaker) return 0; // default 0
        const idx = uiParticipants.findIndex(p => p.id === wsState.currentSpeaker!.id);
        return idx !== -1 ? idx : 0;
    }, [wsState.currentSpeaker, uiParticipants]);


    // --------------------------------------------------------------------------------
    // 3. Side Effects (로직 처리)
    // --------------------------------------------------------------------------------

    // 세션 자동 접속
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

    // 스테이지 변경 시 상태 초기화 및 Notice 설정
    useEffect(() => {
        setHasVoted(false);
        setSelectedCard(null);

        const stage = wsState.currentStage;
        if (stage === 'VOTE_FIRST') setCurrentNotice('당신의 마음은 사로잡은 사람은?');
        else if (stage === 'VOTE_FINAL') setCurrentNotice('운명의 상대를 선택해주세요');
        else if (stage === 'SELF_INTRO') setCurrentNotice('이제 자기소개를 시작합니다');
        else setCurrentNotice(null);

        // 3초 후 노티스 자동 숨김 (화면 렌더링을 위해)
        if (['VOTE_FIRST', 'VOTE_FINAL', 'SELF_INTRO'].includes(stage)) {
            const timer = setTimeout(() => {
                setCurrentNotice(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [wsState.currentStage]);

    // Break Time Notice Update
    useEffect(() => {
        // wsState.lastMessage가 "잠시 후..." 처럼 BREAK 메시지일 경우
        // 또는 wsState.remainingTime이 바뀔 때 BREAK 상태인지 확인하는 플래그가 필요할 수도 있음.
        // 여기서는 lastMessage를 활용하거나, Stage 전환 시점을 이용
        if (wsState.lastMessage?.includes('다음 단계로')) {
             // BREAK 감지 (useRotation에서 설정한 메시지)
             // 직전 스테이지에 따라 문구 설정 (이걸 위해선 previousStage 저장이 필요할 수 있음)
             // 간단히: 현재 currentStage 값을 보고 다음 스테이지 예고
             
             let nextMsg = "잠시 후 다음 단계가 시작됩니다";
             if (wsState.currentStage === 'SELF_INTRO') nextMsg = "곧 첫인상 투표가 진행됩니다";
             else if (wsState.currentStage === 'VOTE_FIRST') nextMsg = "곧 1:1 로테이션 대화가 시작됩니다";
             else if (wsState.currentStage === 'ROTATION_SHORT') nextMsg = "파트너가 변경됩니다";
             
             setCurrentNotice(nextMsg);
        }
    }, [wsState.lastMessage, wsState.currentStage]);

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

    // 라인 드로잉 로직 (MATCHING_RESULT)
    useEffect(() => {
        if (wsState.currentStage !== 'MATCHING_RESULT') {
            setLines([]);
            return;
        }
        const timer = setTimeout(() => {
            if (!svgRef.current) return;
            const svgRect = svgRef.current.getBoundingClientRect();
            const newLines: any[] = [];
            const myId = userProfile.userId;
            const partnerId = wsState.currentPartner?.id;

            // 나 - 파트너 연결
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
                    isReverse: false
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

        if (targetId !== null) setSelectedCard(targetId);
        submitVote(targetId);
        setHasVoted(true);
    };

    const handleGoHome = () => {
        alert("홈으로 이동합니다!");
        window.location.href = '/home';
    };

    // 리다이렉트 화면
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
    // 5. 렌더링 (RotationMeetingContainer UI 이식)
    // --------------------------------------------------------------------------------

    return (
        <div className="h-screen w-full bg-[#0F0F0F] text-white flex flex-col font-['Pretendard'] overflow-hidden selection:bg-[#FF4D94] selection:text-white">

            {/* Header */}
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

                {/* Status Indicator */}
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

            {/* Main Content */}
            <main className="flex-1 w-full relative flex flex-col items-center justify-center p-8 overflow-hidden">
                {/* Background */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#FF4D94] rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />

                {currentNotice ? (
                    <div className="absolute inset-0 flex items-center justify-center z-50 bg-[#0F0F0F]/80 backdrop-blur-sm animate-in fade-in duration-300">
                        <h2 className="text-4xl md:text-6xl font-black text-white text-center leading-tight drop-shadow-2xl px-8">
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

                        {/* STEP 0: INTRO - 백엔드 스테이지에는 없지만 필요시 추가 */}
                        {wsState.currentStage === 'SELF_INTRO' && (
                            <Step1_Intro
                                participants={uiParticipants}
                                activeSpeakerIdx={activeSpeakerIdx}
                            />
                        )}

                        {/* STEP 2: VOTE (FIRST) */}
                        {wsState.currentStage === 'VOTE_FIRST' && (
                            <Step2_Vote
                                participants={uiParticipants}
                                // 임시로 any 처리했으나, 실제론 currentUserGender={userProfile.gender} 가 맞을 수 있음
                                // 하지만 Step2_FirstVote.tsx를 확인하지 않았으므로 방어적으로.
                                // 린트 에러 'Property currentUser does not exist' -> currentUserGender로 변경
                                currentUserGender={userProfile.gender}
                                selectedCard={selectedCard}
                                onSelect={handleChoice}
                            />
                        )}

                        {/* STEP 2: RESULT */}
                        {/* 백엔드 스테이지에 STEP 2 RESULT가 따로 있는지 확인 필요. 
                            FIRST_VOTE_RESULT가 들어오면 잠시 보여주거나, 별도의 스테이지 체크 필요.
                            여기서는 wsState.firstVoteResults가 있으면 보여주는 식으로 처리할 수도 있음.
                            하지만 STAGE가 여전히 VOTE_FIRST이거나 다음 단계일 수 있음.
                            일단 VOTE_FIRST 직후 BREAK 시간에 보여준다고 가정?
                            혹은 별도 UI 모달로? 
                            사용자 요청은 "투표 결과에 따라 프론트에서 투표 화면을 실제 데이터로 수정해" 라고 했으므로,
                            Step2_Result를 사용하는 타이밍을 잡아야 함.
                            만약 BREAK이고, 직전 스테이지가 VOTE_FIRST라면?
                        */}
                        {(wsState.currentStage === 'VOTE_FIRST' || wsState.firstVoteResults) && wsState.firstVoteResults && (
                            <div className="absolute inset-0 z-40 bg-black/90">
                                <Step2_Result
                                    participants={uiParticipants}
                                    results={wsState.firstVoteResults}
                                />
                            </div>
                        )}

                        {/* STEP 3 & 4: TALK (ROTATION) */}
                        {(wsState.currentStage === 'ROTATION_SHORT' || wsState.currentStage === 'ROTATION_LONG') && uiPartner && (
                            <Step4_Talk
                                partners={[uiPartner as any]}
                                currentPartnerIndex={0}
                                remainingTime={wsState.remainingTime}
                                myStream={publisher || undefined} // 내 스트림 전달
                            />
                        )}      {/* Step3_Talk props: partners, currentPartnerIndex, remainingTime
                                    RotationMeetingContainer: partners={UI participants filtered}, currentPartnerIndex={idx}
                                    백엔드 연동 시: 단일 파트너 뷰로 보여주는게 나을 수도 있음.
                        하지만 기존 컴포넌트 재사용하려면 props 맞춰야 함.
                        여기선 Step4_Talk (1:1 UI)를 재사용하거나 Step3를 맞춤.
                        RotationMeetingContainer를 보면 Step3, Step4 UI가 다름. */}


                        {/* STEP 5: FINAL VOTE */}
                        {wsState.currentStage === 'VOTE_FINAL' && (
                            <Step5_FinalVote
                                participants={uiParticipants}
                                currentUserGender={userProfile.gender}
                                selectedCard={selectedCard}
                                onSelect={handleChoice}
                            />
                        )}

                        {/* STEP 5: FINAL RESULT (MATCH_RESULT) */}
                        {wsState.currentStage === 'MATCHING_RESULT' && (
                            <Step5_FinalResult
                            // props TODO
                            />
                        )}

                        {/* STEP 6: SUCCESS / FAIL */}
                        {/* 백엔드엔 MATCHING_RESULT 하나인데 결과에 따라 갈림 */}
                        {/* MATCHING_RESULT payload에 isMatched가 있음.
                             근데 STAGE는 MATCHING_RESULT로 퉁쳐짐.
                             별도 스테이지 분기 로직이 필요함.
                             wsState.lastMessage 등을 보고 판단?
                             아니면 MATCH_RESULT 이벤트에서 별도 상태(isMatched) 저장 필요.
                         */}

                        {/* STEP 7: FACE REVEAL */}
                        {wsState.currentStage === 'FACE_REVEAL' && uiPartner && (
                            <Step7_FaceReveal
                                onComplete={() => {
                                    handleGoHome();
                                }}
                            />
                        )}

                        {/* Step7: Message Room */}
                        {/* FACE_REVEAL 끝난 후? */}

                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="w-full px-8 pb-8 pt-4 flex justify-between items-end z-30">
                <div className="flex gap-2">
                    {/* Debug UI 제거 */}
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
