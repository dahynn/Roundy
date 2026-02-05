import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Mic, Video, LogOut, FastForward } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useRotationSystem } from '@/hooks/meeting/useRotation';
import { useOpenVidu } from '@/hooks/meeting/useOpenVidu';

// 분리된 스텝 컴포넌트들을 불러옵니다.
import { Step1_Intro } from './Step1_Intro';
import { Step2_Vote } from './Step2_Vote';
import { Step3_Result } from './Step3_Result';
import { Step4_Talk } from './Step4_Talk';
import { Step5_ImageGame } from './Step5_ImageGame';
import { Step6_FinalResult } from './Step6_FinalResult';
import { Step7_FaceReveal } from './Step7_FaceReveal';
import { StepLoading_Preference } from './StepLoading_Preference';

export default function RotationMeetingContainer() {
  const navigate = useNavigate();
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  // --- 1. 유저 정보 로드 (토큰 디코딩 또는 API 호출 대체) ---
  // 개발용: 이름과 성별을 로컬스토리지나 임의로 설정
  // 실제로는 Context나 Recoil 비동기 로드 필요
  const accessToken = localStorage.getItem('accessToken') || '';
  const currentUser = useMemo(() => {
    // 임시 파싱: 실제로는 jwt-decode 사용 권장
    try {
      if (!accessToken) throw new Error('No Token');
      // Mock JWT Decoding validation (if user used Dev Login)
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      return {
        userId: payload.userId || 999,
        username: payload.nickname || 'Guest',
        gender: payload.gender || 'MALE',
        mode: 'PAIR_ONLY' as const
      };
    } catch (e) {
      return { userId: Math.floor(Math.random() * 1000), username: 'User', gender: 'MALE', mode: 'PAIR_ONLY' as const };
    }
  }, [accessToken]);

  // --- 2. Real Logic Hooks ---
  // roomId는 매칭 전에는 모르지만, useRotationSystem이 내부적으로 처리하도록 수정했음
  const { state: wsState, submitVote, submitGameAnswer, leaveRoom } = useRotationSystem('', currentUser);
  const { publisher, subscribers, joinSession, leaveSession } = useOpenVidu();

  // --- 3. OpenVidu Session Management ---
  // WS에서 partner(또는 로비) 정보가 오면 OpenVidu 접속
  useEffect(() => {
    const sessionInfo = wsState.currentPartner; // 이름은 currentPartner지만 로비 정보도 포함됨
    if (sessionInfo?.sessionId && sessionInfo?.token) {
      console.log(`[OpenVidu] Joining session: ${sessionInfo.sessionId}`);
      joinSession(sessionInfo.sessionId, sessionInfo.token, currentUser.username);
    }
  }, [wsState.currentPartner?.sessionId, wsState.currentPartner?.token, joinSession, currentUser.username]);

  // --- 4. State Mapping (WS Stage -> UI Stage) ---
  const uiStage = useMemo(() => {
    switch (wsState.currentStage) {
      case 'WAITING': return 'PREPARE'; // or INTRO?
      case 'SELF_INTRO': return 'INTRO';
      case 'VOTE_FIRST': return 'VOTE_1';
      // RESULT_1 (중간 결과) 단계가 WS에 명시적으로 없다면, VOTE_FIRST 끝난 직후나 ROTATION_SHORT 직전?
      // 현재 WS 로직상 VOTE_FIRST -> PAIR_ASSIGNED -> ROTATION_SHORT 순서임.
      // UI의 'RESULT_1'은 3초 정도 보여주는 연출용 스테이지이므로,
      // WS 스테이지가 변경될 때 클라이언트에서 잠시 보여주는 식으로 처리해야 함.
      // 일단은 직접 매핑:
      case 'ROTATION_SHORT': return 'TALK_1_ON_1_SHORT';
      case 'IMAGE_GAME': return 'IMAGE_GAME';
      case 'ROTATION_LONG': return 'TALK_1_ON_1_LONG';
      case 'VOTE_FINAL': return 'VOTE_FINAL';
      case 'MATCH_RESULT': return 'RESULT_FINAL';
      case 'FACE_REVEAL': return 'FACE_REVEAL';
      default: return 'PREPARE';
    }
  }, [wsState.currentStage]);

  const [currentNotice, setCurrentNotice] = useState<string | null>(null);
  const [displayText, setDisplayText] = useState('');
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  // --- 5. Stage Transition Effects (Notices) ---
  useEffect(() => {
    // 스테이지 변경 시 알림 문구 설정
    if (wsState.currentStage === 'SELF_INTRO') setCurrentNotice('자기소개를 시작합니다.');
    else if (wsState.currentStage === 'VOTE_FIRST') {
      setCurrentNotice('첫인상 투표 시간입니다.');
      setSelectedCard(null);
    }
    else if (wsState.currentStage === 'ROTATION_SHORT') setCurrentNotice('1:1 대화를 시작합니다.');
    else if (wsState.currentStage === 'IMAGE_GAME') setCurrentNotice('이미지 게임!');
    else if (wsState.currentStage === 'VOTE_FINAL') setCurrentNotice('최종 선택의 시간입니다.');
    else setCurrentNotice(null);
  }, [wsState.currentStage]);

  // 3. 타이핑 애니메이션
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

  // Data Mapping for UI Components
  const uiParticipants = useMemo(() => {
    return wsState.participants.map(p => ({
      id: p.userId,
      name: p.nickname,
      gender: p.gender,
      badges: [], // TODO: 백엔드에서 배지 정보 주면 매핑
      // 스트림 매핑 (닉네임 기반 매칭 시도)
      streamManager: subscribers.find(sub => {
        try {
          const data = JSON.parse(sub.stream.connection.data).clientData;
          return data === p.nickname || data === p.username; // clientData가 username이라고 가정
        } catch (e) { return false; }
      })
    }));
  }, [wsState.participants, subscribers]);

  const uiPartner = {
    id: wsState.currentPartner?.id || 0,
    name: wsState.currentPartner?.nickname || 'Unknown',
    gender: currentUser.gender === 'MALE' ? 'FEMALE' : 'MALE', // 상대 성별 추론
  };

  const handleGoHome = () => {
    leaveRoom();
    navigate('/');
  };

  // Vote Handler
  const handleVote = (targetId: number) => {
    setSelectedCard(targetId);
    submitVote(targetId);
  };

  // Game Handler (Example)
  const handleGameSelect = (targetId: number) => {
    setSelectedCard(targetId);
    // 이미지 게임은 정답(타겟ID)을 전송한다고 가정
    // Hook의 submitGameAnswer는 string을 받으므로 JSON 변환
    const payload = {
      questionIndex: 0, // TODO: Round Tracking
      targetUserId: targetId
    };
    submitGameAnswer(JSON.stringify(payload));
  };


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

        {/* Status Indicator Pill */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-2 rounded-full shadow-2xl">
          <div className={`w-2 h-2 rounded-full ${wsState.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-sm font-bold text-white/80 uppercase mr-4">
            {uiStage.replace(/_/g, ' ')}
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
            onClick={handleGoHome}
            className="flex items-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-2xl transition-all group">
            <LogOut size={18} className="text-red-500 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold text-red-500 uppercase">Exit</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
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
            {uiStage === 'INTRO' && (
              <Step1_Intro
                participants={uiParticipants}
                publisher={publisher} // Pass Publisher
                subscribers={subscribers} // Pass Subscribers
                activeSpeakerIdx={null}
              />
            )}

            {(uiStage === 'VOTE_1' || uiStage === 'VOTE_FINAL') && (
              <Step2_Vote
                participants={uiParticipants}
                currentUser={currentUser}
                selectedCard={selectedCard}
                onSelect={handleVote} // Connect Handler
              />
            )}

            {/* TODO: Result Logic Need real data mapping */}
            {(uiStage === 'RESULT_1' || uiStage === 'RESULT_FINAL') && (
              <Step3_Result
                participants={uiParticipants}
                resultSubStage={'MALE_SIDE'}
                anchorRefs={{ current: [] }}
                svgRef={{ current: null }}
                lines={[]}
              />
            )}

            {(uiStage === 'TALK_1_ON_1_SHORT' || uiStage === 'TALK_1_ON_1_LONG') && (
              <Step4_Talk
                partner={uiPartner}
                currentUser={currentUser}
                showCards={uiStage === 'TALK_1_ON_1_LONG'}
                // Video Props
                publisher={publisher}
                subscribers={subscribers}
              />
            )}

            {uiStage === 'IMAGE_GAME' && (
              <Step5_ImageGame
                gameRound={1}
                participants={uiParticipants}
                currentUser={currentUser}
                selectedCard={selectedCard}
                onSelect={handleGameSelect}
                isResult={false}
              />
            )}

            {uiStage === 'LOADING_TALK_LONG' && (
              <StepLoading_Preference
                partnerName={uiPartner.name}
                mySucces={true}
                timeLeft={wsState.remainingTime}
                partnerId={uiPartner.id}
              />
            )}

            {uiStage === 'FACE_REVEAL' && (
              <Step7_FaceReveal
                myInfo={currentUser}
                partnerInfo={uiPartner}
                onGoHome={handleGoHome}
                publisher={publisher}
                subscribers={subscribers}
              />
            )}

            {(uiStage === 'PREPARE') && (
              <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500">
                <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-[#FF4D94] animate-spin" />
                <div className="text-center">
                  <h2 className="text-3xl font-bold mb-2 text-white">참가자 입장 대기 중...</h2>
                  <p className="text-white/40">잠시만 기다려주세요.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer / Controls */}
      <footer className="w-full px-8 pb-8 pt-4 flex justify-between items-end z-30">
        <div className="flex gap-2">
          {/* Debug Buttons Removed */}
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
            <span className="text-[10px] font-bold text-[#FF4D94] uppercase tracking-widest mb-0.5">My Profille</span>
            <span className="text-lg font-black text-white uppercase tracking-tight">{currentUser.username}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
