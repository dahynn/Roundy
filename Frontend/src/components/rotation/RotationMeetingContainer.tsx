import React, { useState, useEffect } from 'react';
import { Settings, Mic, Video, LogOut, FastForward } from 'lucide-react';
// import { useRotation } from '@/hooks/meeting/useRotation'; // Backend excluded for UI mock

// 분리된 스텝 컴포넌트들을 불러옵니다.
import { Step1_Intro } from './Step1_Intro';
import { Step2_Vote } from './Step2_Vote';
// import { Step3_Result } from './Step3_Result'; // Already imported? Wait, checking file.
import { Step3_Result } from './Step3_Result';
import { Step4_Talk } from './Step4_Talk';
import { Step5_ImageGame } from './Step5_ImageGame';
import { Step6_FinalResult } from './Step6_FinalResult';
import { Step7_FaceReveal } from './Step7_FaceReveal';
import { StepLoading_Preference } from './StepLoading_Preference';

export default function RotationMeetingContainer() {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  // --- Mock Hook Simulation (백엔드 미구현 상태) ---
  // const { state } = useRotation(roomId, currentUser);

  // Mock State
  const [mockState, setMockState] = useState({
    connected: true,
    mode: 'PAIR_ONLY',
    currentStage: 'PREPARE', // Start with PREPARE
    currentRound: 1,
    totalRounds: 3,
    remainingTime: 0,
    finalMatchSuccess: true, // For Demo: Toggle Success/Fail
    participants: Array.from({ length: 6 }).map((_, i) => ({
      userId: i + 1,
      nickname: i < 3 ? `남자 ${i + 1}호` : `여자 ${i - 2}호`,
      gender: i < 3 ? 'MALE' : 'FEMALE'
    })),
    currentPartner: { id: 2, nickname: '남자 2호', sessionId: 'mock-session', token: 'mock-token' }
  });

  // --- UI 단계 관리 (이미지 흐름 기반 확장) ---
  const [uiStage, setUiStage] = useState<
    'PREPARE' | 'INTRO' |
    'VOTE_1' | 'RESULT_1' |
    'LOADING_TALK_SHORT' | 'TALK_1_ON_1_SHORT' |
    'LOADING_GAME' | 'IMAGE_GAME' |
    'LOADING_TALK_LONG' | 'TALK_1_ON_1_LONG' |
    'LOADING_FINAL' | 'VOTE_FINAL' | 'RESULT_FINAL' | 'FACE_REVEAL' |
    'WAITING'
  >('PREPARE');

  const [currentNotice, setCurrentNotice] = useState<string | null>(null);
  const [displayText, setDisplayText] = useState('');

  // UI용 파생 데이터
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  // Intro Messages Logic
  const msgs = [
    'Hello',
    '안녕하세요, 라운디입니다.',
    '로테이션 소개팅에 오신 걸 환영합니다.',
    '이제 자기소개를 시작합니다.',
  ];
  const [msgIndex, setMsgIndex] = useState(0);

  // Mock Flow Simulation Effect (Full Linear Sequence)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const runSequence = () => {
      // 0. 준비 (메시지)
      if (uiStage === 'PREPARE') {
        if (msgIndex < msgs.length) {
          setCurrentNotice(msgs[msgIndex]);
          timer = setTimeout(() => setMsgIndex(prev => prev + 1), 2500);
        } else {
          setCurrentNotice(null);
          setUiStage('INTRO');
          setMockState(prev => ({ ...prev, remainingTime: 10 }));
        }
      }
      // 1. 자기소개
      else if (uiStage === 'INTRO') {
        timer = setInterval(() => {
          setMockState(prev => {
            if (prev.remainingTime <= 1) {
              clearInterval(timer);
              setUiStage('VOTE_1');
              setMockState(p => ({ ...p, remainingTime: 15 }));
              return { ...prev, remainingTime: 0 };
            }
            return { ...prev, remainingTime: prev.remainingTime - 1 };
          });
        }, 1000);
      }
      // 2. 첫인상 투표
      else if (uiStage === 'VOTE_1') {
        setCurrentNotice('당신의 마음은 사로잡은 사람은?');
        timer = setInterval(() => {
          setMockState(prev => {
            if (prev.remainingTime <= 1) {
              clearInterval(timer);
              setUiStage('RESULT_1');
              setCurrentNotice(null);
              setMockState(p => ({ ...p, remainingTime: 8 }));
              return { ...prev, remainingTime: 0 };
            }
            return { ...prev, remainingTime: prev.remainingTime - 1 };
          });
        }, 1000);
      }
      // 3. 1차 결과
      else if (uiStage === 'RESULT_1') {
        timer = setInterval(() => {
          setMockState(prev => {
            if (prev.remainingTime <= 1) {
              clearInterval(timer);
              setUiStage('LOADING_TALK_SHORT');
              setCurrentNotice('가볍게 인사를 나누어 보세요!!');
              setMockState(p => ({ ...p, remainingTime: 3 }));
              return { ...prev, remainingTime: 0 };
            }
            return { ...prev, remainingTime: prev.remainingTime - 1 };
          });
        }, 1000);
      }
      // 4-0. 로딩 (Short Talk)
      else if (uiStage === 'LOADING_TALK_SHORT') {
        timer = setInterval(() => {
          setMockState(prev => {
            if (prev.remainingTime <= 1) {
              clearInterval(timer);
              setUiStage('TALK_1_ON_1_SHORT');
              setCurrentNotice(null);
              setMockState(p => ({ ...p, remainingTime: 60 })); // 1 min
              return { ...prev, remainingTime: 0 };
            }
            return { ...prev, remainingTime: prev.remainingTime - 1 };
          });
        }, 1000);
      }
      // 4. 1:1 소개팅 (Short)
      else if (uiStage === 'TALK_1_ON_1_SHORT') {
        timer = setInterval(() => {
          setMockState(prev => {
            if (prev.remainingTime <= 1) {
              clearInterval(timer);
              setUiStage('LOADING_GAME');
              setCurrentNotice('이미지 게임을 시작합니다');
              setMockState(p => ({ ...p, remainingTime: 3 }));
              return { ...prev, remainingTime: 0 };
            }
            return { ...prev, remainingTime: prev.remainingTime - 1 };
          });
        }, 1000);
      }
      // 5-0. 로딩 (Game)
      else if (uiStage === 'LOADING_GAME') {
        timer = setInterval(() => {
          setMockState(prev => {
            if (prev.remainingTime <= 1) {
              clearInterval(timer);
              setUiStage('IMAGE_GAME');
              setCurrentNotice(null);
              setMockState(p => ({ ...p, remainingTime: 30 })); // 30s Game
              return { ...prev, remainingTime: 0 };
            }
            return { ...prev, remainingTime: prev.remainingTime - 1 };
          });
        }, 1000);
      }
      // 5. 이미지 게임
      else if (uiStage === 'IMAGE_GAME') {
        timer = setInterval(() => {
          setMockState(prev => {
            if (prev.remainingTime <= 1) {
              clearInterval(timer);
              setUiStage('LOADING_TALK_LONG');
              setCurrentNotice(null); // Clear notice to show component
              setMockState(p => ({ ...p, remainingTime: 5 }));
              return { ...prev, remainingTime: 0 };
            }
            return { ...prev, remainingTime: prev.remainingTime - 1 };
          });
        }, 1000);
      }
      // 6-0. 로딩 (Long Talk)
      else if (uiStage === 'LOADING_TALK_LONG') {
        timer = setInterval(() => {
          setMockState(prev => {
            if (prev.remainingTime <= 1) {
              clearInterval(timer);
              setUiStage('TALK_1_ON_1_LONG');
              setCurrentNotice(null);
              setMockState(p => ({ ...p, remainingTime: 180 })); // 3 min
              return { ...prev, remainingTime: 0 };
            }
            return { ...prev, remainingTime: prev.remainingTime - 1 };
          });
        }, 1000);
      }
      // 6. 1:1 소개팅 (Long)
      else if (uiStage === 'TALK_1_ON_1_LONG') {
        timer = setInterval(() => {
          setMockState(prev => {
            if (prev.remainingTime <= 1) {
              clearInterval(timer);
              setUiStage('LOADING_FINAL');
              setCurrentNotice('최종 선택의 시간입니다');
              setMockState(p => ({ ...p, remainingTime: 3 }));
              return { ...prev, remainingTime: 0 };
            }
            return { ...prev, remainingTime: prev.remainingTime - 1 };
          });
        }, 1000);
      }
      // 7-0. 로딩 (Final Vote)
      else if (uiStage === 'LOADING_FINAL') {
        timer = setInterval(() => {
          setMockState(prev => {
            if (prev.remainingTime <= 1) {
              clearInterval(timer);
              setUiStage('VOTE_FINAL');
              setCurrentNotice(null);
              setMockState(p => ({ ...p, remainingTime: 20 }));
              return { ...prev, remainingTime: 0 };
            }
            return { ...prev, remainingTime: prev.remainingTime - 1 };
          });
        }, 1000);
      }
      // 7. 최종 투표
      else if (uiStage === 'VOTE_FINAL') {
        setCurrentNotice('운명의 상대를 선택해주세요');
        timer = setInterval(() => {
          setMockState(prev => {
            if (prev.remainingTime <= 1) {
              clearInterval(timer);
              setUiStage('RESULT_FINAL');
              setCurrentNotice(null);
              setMockState(p => ({ ...p, remainingTime: 600 })); // Show Result for plenty of time
              return { ...prev, remainingTime: 0 };
            }
            return { ...prev, remainingTime: prev.remainingTime - 1 };
          });
        }, 1000);
      }
      // 8. 최종 결과 (Stop)
      else if (uiStage === 'RESULT_FINAL') {
        // Stop here for Demo
      }
    };

    runSequence();

    return () => {
      clearTimeout(timer);
      clearInterval(timer);
    }
  }, [uiStage, msgIndex]);

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

  const currentUser = { userId: 101, username: 'User (You)' };

  // Data Mapping for UI Components
  const uiParticipants = mockState.participants.map(p => ({
    id: p.userId,
    name: p.nickname,
    gender: p.gender,
    voteTo: (p.userId % 6) + 1, // Mock vote target
    keywords: ['여행', '운동'],
    badges: []
  }));

  const uiPartner = {
    id: mockState.currentPartner.id,
    name: mockState.currentPartner.nickname,
    gender: 'MALE',
    voteTo: 0,
    keywords: [],
    badges: []
  };

  const handleGoHome = () => {
    alert("홈으로 이동합니다!");
    setUiStage('PREPARE');
    setMsgIndex(0);
  };

  const handleAgreeReveal = () => {
    setUiStage('FACE_REVEAL');
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
          <div className={`w-2 h-2 rounded-full ${mockState.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-sm font-bold text-white/80 uppercase mr-4">
            {uiStage.replace(/_/g, ' ')}
          </span>
          <div className="w-px h-4 bg-white/10" />
          <span className="text-2xl font-black text-[#FF4D94] tabular-nums w-[80px] text-center">
            {Math.floor(mockState.remainingTime / 60).toString().padStart(2, '0')}:
            {(mockState.remainingTime % 60).toString().padStart(2, '0')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all hover:scale-105 active:scale-95">
            <Settings size={20} className="text-white/60" />
          </button>
          <button className="flex items-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-2xl transition-all group">
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
              <Step1_Intro participants={uiParticipants} activeSpeakerIdx={null} />
            )}

            {(uiStage === 'VOTE_1' || uiStage === 'VOTE_FINAL') && (
              <Step2_Vote
                participants={uiParticipants}
                currentUser={{ gender: 'MALE' }}
                selectedCard={selectedCard}
                onSelect={setSelectedCard}
              />
            )}

            {(uiStage === 'RESULT_1') && (
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
              />
            )}

            {uiStage === 'IMAGE_GAME' && (
              <Step5_ImageGame
                gameRound={1}
                participants={uiParticipants}
                currentUser={{ gender: 'MALE' }}
                selectedCard={selectedCard}
                onSelect={setSelectedCard}
                isResult={false}
              />
            )}

            {uiStage === 'LOADING_TALK_LONG' && (
              <StepLoading_Preference
                partnerName={uiPartner.name}
                mySucces={true}
                timeLeft={mockState.remainingTime}
                partnerId={uiPartner.id}
              />
            )}

            {uiStage === 'RESULT_FINAL' && (
              <Step6_FinalResult
                isSuccess={mockState.finalMatchSuccess}
                myInfo={currentUser}
                partnerInfo={uiPartner}
                onGoHome={handleGoHome}
                onAgreeReveal={handleAgreeReveal}
              />
            )}

            {uiStage === 'FACE_REVEAL' && (
              <Step7_FaceReveal
                myInfo={currentUser}
                partnerInfo={uiPartner}
                onGoHome={handleGoHome}
              />
            )}

            {(uiStage === 'WAITING') && (
              <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500">
                <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-[#FF4D94] animate-spin" />
                <div className="text-center">
                  <h2 className="text-3xl font-bold mb-2 text-white">모든 라운드 종료</h2>
                  <p className="text-white/40">수고하셨습니다.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer / Controls */}
      <footer className="w-full px-8 pb-8 pt-4 flex justify-between items-end z-30">
        <div className="flex gap-2">
          <button
            className="flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[24px] backdrop-blur-md transition-all group"
            onClick={() => setMockState(p => ({ ...p, remainingTime: 1 }))} // Debug skip
          >
            <div className="w-8 h-8 rounded-full bg-[#FF4D94]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FastForward size={16} className="text-[#FF4D94]" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Debug</span>
              <span className="text-sm font-black text-white">SKIP STAGE</span>
            </div>
          </button>

          <button
            className={`flex items-center gap-3 px-6 py-4 border rounded-[24px] backdrop-blur-md transition-all group ${mockState.finalMatchSuccess ? 'bg-pink-500/20 border-pink-500' : 'bg-gray-800/50 border-gray-600'}`}
            onClick={() => setMockState(p => ({ ...p, finalMatchSuccess: !p.finalMatchSuccess }))}
          >
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Debug</span>
              <span className="text-sm font-black text-white">
                {mockState.finalMatchSuccess ? 'RESULT: SUCCESS' : 'RESULT: FAIL'}
              </span>
            </div>
          </button>
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
