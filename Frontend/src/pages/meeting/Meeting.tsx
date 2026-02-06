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
    const { state: wsState, submitVote, submitGameAnswer, leaveRoom, sendFaceRevealPermission } = useRotationSystem(roomId, token, userProfile);
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

    // [NEW] Persist First Vote Results
    const [localVoteResults, setLocalVoteResults] = useState<any[] | null>(null);

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
    // 4. 핸들러 함수 (useEffect보다 먼저 정의)
    // --------------------------------------------------------------------------------

    const handleFaceRevealResponse = (accepted: boolean) => {
        console.log('Face Reveal Accepted:', accepted);
        sendFaceRevealPermission(accepted);
        // UI적인 처리가 필요한가? e.g. 대기 중 표시
    };

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
        // [FIX] isBreak 상태이거나 BREAK 관련 메시지일 때 Notice 유지
        if (wsState.isBreak || wsState.lastMessage?.includes('다음 단계로') || wsState.lastMessage?.includes('파트너가 변경됩니다')) {
            let nextMsg = "잠시 후 다음 단계가 시작됩니다";
            if (wsState.currentStage === 'SELF_INTRO') nextMsg = "곧 첫인상 투표가 진행됩니다";
            else if (wsState.currentStage === 'VOTE_FIRST') nextMsg = "곧 1:1 로테이션 대화가 시작됩니다";
            else if (wsState.currentStage === 'ROTATION_SHORT') nextMsg = "파트너가 변경됩니다";
            else if (wsState.currentStage === 'ROTATION_LONG') nextMsg = "파트너가 변경됩니다";

            setCurrentNotice(nextMsg);

            // [FIX] isBreak가 true일 때는 자동 숨김 하지 않음 (전환 완료될 때까지 유지)
            if (!wsState.isBreak) {
                const timer = setTimeout(() => {
                    setCurrentNotice(null);
                }, 3000);
                return () => clearTimeout(timer);
            }
        } else {
            // isBreak가 해제되면 Notice도 해제 (단, 다른 로직에 의해 설정된 경우 제외)
            // 여기서는 명시적으로 끄지 않아도 됨. STAGE_CHANGE 훅에서 처리됨.
        }
    }, [wsState.isBreak, wsState.lastMessage, wsState.currentStage]);

    // Typing Animation Effect
    useEffect(() => {
        if (!currentNotice) {
            setDisplayText('');
            return;
        }

        setDisplayText('');
        let i = 0;
        const speed = 50; // ms
        const text = currentNotice;

        const interval = setInterval(() => {
            setDisplayText(text.slice(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(interval);
        }, speed);

        return () => clearInterval(interval);
    }, [currentNotice]);

    // Persist First Vote Results Logic
    useEffect(() => {
        if (wsState.firstVoteResults) {
            console.log("Showing First Vote Results locally");
            setLocalVoteResults(wsState.firstVoteResults);

            // 결과 화면 15초 유지 후 숨김 (애니메이션 시간 고려)
            const timer = setTimeout(() => {
                setLocalVoteResults(null);
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [wsState.firstVoteResults]);

    // ... (Auto Vote Logic skipped) ...

    // ... (Line Drawing skipped) ...
    // Note: Line drawing logic was for MATCHING_RESULT but we might not need it if we switch to Step6

    // --------------------------------------------------------------------------------
    // 4. 핸들러 함수
    // --------------------------------------------------------------------------------
    // ...

    // --------------------------------------------------------------------------------
    // 5. 렌더링
    // --------------------------------------------------------------------------------

    return (
        <div className="h-screen w-full bg-[#0F0F0F] text-white flex flex-col font-['Pretendard'] overflow-hidden selection:bg-[#FF4D94] selection:text-white">

            {/* Header ... */}
            <header className="flex items-center justify-between px-8 py-6 z-30">
                {/* ... header content ... (Using existing code, just context) */}
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
                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-2 rounded-full shadow-2xl relative overflow-hidden">
                        {/* Gauge Background */}
                        <div
                            className="absolute bottom-0 left-0 h-1 bg-[#FF4D94] transition-all duration-1000 ease-linear"
                            style={{
                                width: `${wsState.totalTime > 0 ? (wsState.remainingTime / wsState.totalTime) * 100 : 0}%`
                            }}
                        />

                        <div className={`w-2 h-2 rounded-full ${wsState.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-sm font-bold text-white/80 uppercase mr-4">
                            {wsState.currentStage.replace(/_/g, ' ')}
                        </span>
                        <div className="w-px h-4 bg-white/10" />
                        <span className="text-2xl font-black text-[#FF4D94] tabular-nums w-[80px] text-center z-10">
                            {Math.floor(wsState.remainingTime / 60).toString().padStart(2, '0')}:
                            {(wsState.remainingTime % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
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

                        {/* STEP 0: INTRO */}
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
                                currentUserGender={userProfile.gender}
                                selectedCard={selectedCard}
                                onSelect={handleChoice}
                            />
                        )}

                        {/* STEP 2: RESULT */}
                        {/* STEP 2: RESULT - Use local persistent state */}
                        {localVoteResults && (
                            <div className="absolute inset-0 z-40 bg-black/90">
                                <Step2_Result
                                    participants={uiParticipants}
                                    results={localVoteResults}
                                />
                            </div>
                        )}

                        {/* STEP 3 & 4: TALK (ROTATION) - 숏/롱 통합 */}
                        {(wsState.currentStage === 'ROTATION_SHORT' || wsState.currentStage === 'ROTATION_LONG') && uiPartner && !wsState.isBreak && (
                            <Step4_Talk
                                partners={[uiPartner as any]}
                                currentPartnerIndex={0}
                                remainingTime={wsState.remainingTime}
                                myStream={publisher || undefined}
                            />
                        )}

                        {/* STEP 5: FINAL VOTE */}
                        {wsState.currentStage === 'VOTE_FINAL' && (
                            <Step5_FinalVote
                                participants={uiParticipants}
                                currentUserGender={userProfile.gender}
                                selectedCard={selectedCard}
                                onSelect={handleChoice}
                            />
                        )}

                        {/* STEP 6: MATCH RESULT */}
                        {wsState.currentStage === 'MATCHING_RESULT' && (
                            <>
                                {/* [FIX] Step2_Result 스타일로 결과 표시 */}
                                {wsState.matchResult?.matched ? (
                                    <div className="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center">
                                        <Step2_Result
                                            participants={uiParticipants}
                                            results={[
                                                { voterId: userProfile.userId, targetId: wsState.matchResult.partnerId }, // 나의 선택
                                                { voterId: wsState.matchResult.partnerId || 0, targetId: userProfile.userId } // 상대의 선택 (매칭되었으므로)
                                            ]}
                                        />
                                        {/* 매칭 성공 시 추가 액션 (Step6_MatchSuccess로 전환 버튼 등) */}
                                        <div className="absolute bottom-10 z-50 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-3000 fill-mode-forwards opacity-0" style={{ animationDelay: '3s' }}>
                                            <Step6_MatchSuccess
                                                currentUser={{
                                                    id: userProfile.userId,
                                                    name: userProfile.username,
                                                    gender: userProfile.gender
                                                }}
                                                matchedUser={{
                                                    id: wsState.matchResult.partnerId || 0,
                                                    name: wsState.matchResult.partnerNickname || 'Unknown',
                                                    gender: userProfile.gender === 'MALE' ? 'FEMALE' : 'MALE'
                                                }}
                                                onFaceRevealResponse={handleFaceRevealResponse}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <Step6_NoMatch onGoHome={handleGoHome} /> // 매칭 실패 시 바로 NoMatch
                                )}
                            </>
                        )}

                        {/* STEP 7: FACE REVEAL (Final Stage) */}
                        {wsState.currentStage === 'FACE_REVEAL' && uiPartner && (
                            <Step7_FaceReveal
                                onComplete={() => handleGoHome()}
                            />
                        )}

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
