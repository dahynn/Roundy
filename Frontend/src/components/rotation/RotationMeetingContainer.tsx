import React, { useState, useEffect } from 'react';
import { Settings, Mic, Video, LogOut, FastForward } from 'lucide-react';

// 분리된 스텝 컴포넌트들을 불러옵니다.
import { Step0_Intro } from './Step0_Intro';
import { Step1_SelfIntro } from './Step1_SelfIntro';
import { Step2_FirstVote } from './Step2_FirstVote';
import { Step2_Result } from './Step2_Result';
import { Step3_Talk } from './Step3_Talk';
import { Step4_Talk } from './Step4_Talk';
import { Step5_FinalVote } from './Step5_FinalVote';
import { Step5_FinalResult } from './Step5_FinalResult';
import { Step6_MatchSuccess } from './Step6_MatchSuccess';
import { Step6_NoMatch } from './Step6_NoMatch';
import { Step7_FaceReveal } from './Step7_FaceReveal';
import { Step7_MessageRoom } from './Step7_MessageRoom';

export default function RotationMeetingContainer() {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  // Mock State
  const [mockState, setMockState] = useState({
    connected: true,
    remainingTime: 0,
    participants: Array.from({ length: 6 }).map((_, i) => ({
      userId: i + 1,
      nickname: i < 3 ? `남자 ${i + 1}호` : `여자 ${i - 2}호`,
      gender: i < 3 ? 'MALE' : 'FEMALE',
      voteTo: i < 3 ? (i + 4) : (i - 2) // Mock vote: 남자는 여자에게, 여자는 남자에게
    })),
  });

  // UI 단계 관리
  const [uiStage, setUiStage] = useState<
    'STEP0_INTRO' | 'STEP1_INTRO' | 'STEP2_VOTE' | 'STEP2_RESULT' | 'STEP3_TALK' | 'STEP4_LONG_TALK' | 'STEP5_FINAL_VOTE' | 'STEP5_FINAL_RESULT' | 'STEP6_MATCH_SUCCESS' | 'STEP6_NO_MATCH' | 'STEP7_FACE_REVEAL' | 'STEP7_MESSAGE_ROOM'
  >('STEP0_INTRO');

  const [currentNotice, setCurrentNotice] = useState<string | null>(null);
  const [displayText, setDisplayText] = useState('');
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [activeSpeakerIdx, setActiveSpeakerIdx] = useState<number>(0);
  const [currentPartnerIndex, setCurrentPartnerIndex] = useState<number>(0);
  const [isFaceRevealDeclined, setIsFaceRevealDeclined] = useState(false);

  // Intro Messages
  const step0Msgs = [
    'Hello',
    '안녕하세요, 라운디입니다.',
    '로테이션 소개팅에 오신 걸 환영합니다.',
  ];
  const [msgIndex, setMsgIndex] = useState(0);

  // Mock Flow Simulation
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const runSequence = () => {
      // Step 0: 시스템 인트로
      if (uiStage === 'STEP0_INTRO') {
        if (msgIndex < step0Msgs.length) {
          setCurrentNotice(step0Msgs[msgIndex]);
          timer = setTimeout(() => setMsgIndex(prev => prev + 1), 2500);
        } else {
          setCurrentNotice('이제 자기소개를 시작합니다');
          timer = setTimeout(() => {
            setCurrentNotice(null);
            setUiStage('STEP1_INTRO');
            setMockState(prev => ({ ...prev, remainingTime: 180 }));
          }, 2500);
        }
      }
      // Step 1: 자기소개 (각자 30초씩, 총 180초)
      else if (uiStage === 'STEP1_INTRO') {
        timer = setInterval(() => {
          setMockState(prev => {
            // 30초마다 다음 발표자로 전환
            if (prev.remainingTime % 30 === 0 && prev.remainingTime > 0 && prev.remainingTime < 180) {
              setActiveSpeakerIdx(Math.floor((180 - prev.remainingTime) / 30));
            }

            if (prev.remainingTime <= 1) {
              clearInterval(timer);
              setCurrentNotice('당신의 마음을 사로잡은 사람은?');
              timer = setTimeout(() => {
                setCurrentNotice(null);
                setUiStage('STEP2_VOTE');
                setActiveSpeakerIdx(0);
                setMockState(p => ({ ...p, remainingTime: 15 }));
              }, 2500);
              return { ...prev, remainingTime: 0 };
            }
            return { ...prev, remainingTime: prev.remainingTime - 1 };
          });
        }, 1000);
      }
      // Step 2: 첫인상 투표
      else if (uiStage === 'STEP2_VOTE') {
        timer = setInterval(() => {
          setMockState(prev => {
            if (prev.remainingTime <= 1) {
              clearInterval(timer);
              setUiStage('STEP2_RESULT');
              setMockState(p => ({ ...p, remainingTime: 20 }));
              return { ...prev, remainingTime: 0 };
            }
            return { ...prev, remainingTime: prev.remainingTime - 1 };
          });
        }, 1000);
      }
      // Step 2: 결과 공개 (화살표 애니메이션)
      else if (uiStage === 'STEP2_RESULT') {
        timer = setTimeout(() => {
          setUiStage('STEP3_TALK');
          setCurrentPartnerIndex(0);
          setMockState(p => ({ ...p, remainingTime: 120 })); // 2분
        }, 8000); // 8초 후 자동 전환
      }
      // Step 3: 1:1 대화 (3명의 파트너와 각 2분씩)
      else if (uiStage === 'STEP3_TALK') {
        timer = setInterval(() => {
          setMockState(prev => {
            if (prev.remainingTime <= 1) {
              clearInterval(timer);

              // 다음 파트너로 전환 (최대 3명)
              if (currentPartnerIndex < 2) {
                setCurrentPartnerIndex(idx => idx + 1);
                setMockState(p => ({ ...p, remainingTime: 120 })); // 새 2분
              } else {
                // 모든 파트너와 Short Talk 완료 -> Long Talk로 전환
                clearInterval(timer);
                setUiStage('STEP4_LONG_TALK');
                setCurrentPartnerIndex(0);
                setMockState(p => ({ ...p, remainingTime: 300 })); // 5분
              }

              return { ...prev, remainingTime: 0 };
            }
            return { ...prev, remainingTime: prev.remainingTime - 1 };
          });
        }, 1000);
      }
      // Step 4: 1:1 대화 (Long Ver, 5분)
      else if (uiStage === 'STEP4_LONG_TALK') {
        timer = setInterval(() => {
          setMockState(prev => {
            if (prev.remainingTime <= 1) {
              clearInterval(timer);

              // 다음 파트너로 전환 (최대 3명)
              if (currentPartnerIndex < 2) {
                setCurrentPartnerIndex(idx => idx + 1);
                setMockState(p => ({ ...p, remainingTime: 300 })); // 새 5분
              } else {
                // 모든 파트너와 Long Talk 완료
                // 최종 선택 단계로 전환
                clearInterval(timer);
                setUiStage('STEP5_FINAL_VOTE');
                // 시간은 무제한이거나 넉넉하게
                setMockState(p => ({ ...p, remainingTime: 60 }));
              }

              return { ...prev, remainingTime: 0 };
            }
            return { ...prev, remainingTime: prev.remainingTime - 1 };
          });
        }, 1000);
      }

      // Step 5: 최종 투표
      else if (uiStage === 'STEP5_FINAL_VOTE') {
        // 투표 대기... 선택 시 setUiStage('STEP5_FINAL_RESULT') 호출 필요
      }
    };

    runSequence();

    return () => {
      clearTimeout(timer);
      clearInterval(timer);
    };
  }, [uiStage, msgIndex]);

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

  const currentUser = { userId: 101, username: 'User (You)' };

  // Data Mapping
  const uiParticipants = mockState.participants.map(p => ({
    id: p.userId,
    name: p.nickname,
    gender: p.gender as 'MALE' | 'FEMALE',
    voteTo: p.voteTo,
  }));

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
            {uiStage === 'STEP0_INTRO' && <Step0_Intro />}

            {uiStage === 'STEP1_INTRO' && (
              <Step1_SelfIntro
                participants={uiParticipants}
                activeSpeakerIdx={activeSpeakerIdx}
              />
            )}

            {uiStage === 'STEP2_VOTE' && (
              <Step2_FirstVote
                participants={uiParticipants}
                currentUserGender={'MALE'}
                selectedCard={selectedCard}
                onSelect={setSelectedCard}
              />
            )}

            {uiStage === 'STEP2_RESULT' && (
              <Step2_Result participants={uiParticipants} />
            )}

            {uiStage === 'STEP3_TALK' && (
              <Step3_Talk
                partners={uiParticipants
                  .filter(p => p.gender !== 'MALE')
                  .sort((a, b) => a.id - b.id)
                }
                currentPartnerIndex={currentPartnerIndex}
                remainingTime={mockState.remainingTime}
              />
            )}

            {uiStage === 'STEP4_LONG_TALK' && (
              <Step4_Talk
                partners={uiParticipants
                  .filter(p => p.gender !== 'MALE')
                  .sort((a, b) => a.id - b.id)
                }
                currentPartnerIndex={currentPartnerIndex}
                remainingTime={mockState.remainingTime}
              />
            )}

            {uiStage === 'STEP5_FINAL_VOTE' && (
              <Step5_FinalVote
                participants={uiParticipants}
                currentUserGender={'MALE'}
                selectedCard={selectedCard}
                onSelect={(id) => {
                  setSelectedCard(id);
                  // 1초 후 결과 화면으로
                  setTimeout(() => {
                    setUiStage('STEP5_FINAL_RESULT');
                  }, 1500);
                }}
              />
            )}

            {uiStage === 'STEP5_FINAL_RESULT' && (
              <Step5_FinalResult />
            )}

            {uiStage === 'STEP6_MATCH_SUCCESS' && (
              <Step6_MatchSuccess
                currentUser={{ id: 101, name: '남자 1호', gender: 'MALE' }}
                matchedUser={{ id: 104, name: '여자 1호', gender: 'FEMALE' }}
                onFaceRevealResponse={(agreed) => {
                  if (agreed) {
                    // 모두 동의 시 얼굴 공개 단계로
                    setIsFaceRevealDeclined(false);
                    setUiStage('STEP7_FACE_REVEAL');
                  } else {
                    // 거절 시 바로 쪽지함 단계로
                    setIsFaceRevealDeclined(true);
                    setUiStage('STEP7_MESSAGE_ROOM');
                  }
                }}
              />
            )}

            {uiStage === 'STEP6_NO_MATCH' && (
              <Step6_NoMatch onGoHome={() => alert('홈으로 이동')} />
            )}

            {uiStage === 'STEP7_FACE_REVEAL' && (
              <Step7_FaceReveal
                onComplete={() => {
                  setIsFaceRevealDeclined(false);
                  setUiStage('STEP7_MESSAGE_ROOM');
                }}
              />
            )}

            {uiStage === 'STEP7_MESSAGE_ROOM' && (
              <Step7_MessageRoom
                isFaceRevealDeclined={isFaceRevealDeclined}
                onGoToMessage={() => alert('쪽지함 페이지로 이동합니다.')}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full px-8 pb-8 pt-4 flex justify-between items-end z-30">
        <div className="flex gap-2">
          {/* Stage Selector for Debug */}
          <div className="flex items-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-[24px] backdrop-blur-md">
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Debug: Jump to Stage</span>
              <select
                value={uiStage}
                onChange={(e) => {
                  const newStage = e.target.value as typeof uiStage;
                  setUiStage(newStage);
                  setCurrentNotice(null);
                  // Reset relevant states
                  if (newStage === 'STEP0_INTRO') {
                    setMsgIndex(0);
                    setMockState(p => ({ ...p, remainingTime: 0 }));
                  } else if (newStage === 'STEP1_INTRO') {
                    setMockState(p => ({ ...p, remainingTime: 180 }));
                    setActiveSpeakerIdx(0);
                  } else if (newStage === 'STEP2_VOTE') {
                    setMockState(p => ({ ...p, remainingTime: 15 }));
                  } else if (newStage === 'STEP2_RESULT') {
                    setMockState(p => ({ ...p, remainingTime: 20 }));
                  } else if (newStage === 'STEP3_TALK') {
                    setMockState(p => ({ ...p, remainingTime: 120 }));
                    setCurrentPartnerIndex(0);
                  } else if (newStage === 'STEP4_LONG_TALK') {
                    setMockState(p => ({ ...p, remainingTime: 300 }));
                    setCurrentPartnerIndex(0);
                  } else if (newStage === 'STEP5_FINAL_VOTE') {
                    setMockState(p => ({ ...p, remainingTime: 60 }));
                    setSelectedCard(null);
                  } else if (newStage === 'STEP6_MATCH_SUCCESS') {
                    setMockState(p => ({ ...p, remainingTime: 0 }));
                  } else if (newStage === 'STEP6_NO_MATCH') {
                    setMockState(p => ({ ...p, remainingTime: 0 }));
                  } else if (newStage === 'STEP7_FACE_REVEAL') {
                    setMockState(p => ({ ...p, remainingTime: 70 })); // 10s countdown + 60s chat
                  } else if (newStage === 'STEP7_MESSAGE_ROOM') {
                    setMockState(p => ({ ...p, remainingTime: 0 }));
                  }
                }}
                className="bg-[#1A1A1A] text-white border border-white/20 rounded-lg px-3 py-1.5 text-sm font-bold cursor-pointer hover:bg-[#2A2A2A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF4D94]"
              >
                <option value="STEP0_INTRO">Step 0: Intro</option>
                <option value="STEP1_INTRO">Step 1: Self Intro</option>
                <option value="STEP2_VOTE">Step 2: Vote</option>
                <option value="STEP2_RESULT">Step 2: Result</option>
                <option value="STEP3_TALK">Step 3: Talk (Short, 2m)</option>
                <option value="STEP4_LONG_TALK">Step 4: Talk (Long, 5m)</option>
                <option value="STEP5_FINAL_VOTE">Step 5: Final Vote</option>
                <option value="STEP5_FINAL_RESULT">Step 5: Final Result</option>
                <option value="STEP6_MATCH_SUCCESS">Step 6: Match Success</option>
                <option value="STEP6_NO_MATCH">Step 6: No Match</option>
                <option value="STEP7_FACE_REVEAL">Step 7: Face Reveal</option>
                <option value="STEP7_MESSAGE_ROOM">Step 7: Message Room</option>
              </select>
            </div>
          </div>

          {/* Skip Button */}
          <button
            className="flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[24px] backdrop-blur-md transition-all group"
            onClick={() => setMockState(p => ({ ...p, remainingTime: 1 }))}
          >
            <div className="w-8 h-8 rounded-full bg-[#FF4D94]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FastForward size={16} className="text-[#FF4D94]" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Debug</span>
              <span className="text-sm font-black text-white">SKIP</span>
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
            <span className="text-[10px] font-bold text-[#FF4D94] uppercase tracking-widest mb-0.5">My Profile</span>
            <span className="text-lg font-black text-white uppercase tracking-tight">{currentUser.username}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
