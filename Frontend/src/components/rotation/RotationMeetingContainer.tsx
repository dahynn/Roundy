import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Settings, LogOut, FastForward, Mic, Video } from 'lucide-react';
import { useRotation } from '@/hooks/meeting/useRotation';

// 분리된 스텝 컴포넌트들을 불러옵니다.
import { Step1_Intro } from './Step1_Intro';
import { Step2_Vote } from './Step2_Vote';
import { Step3_Result } from './Step3_Result';
import { Step4_Talk } from './Step4_Talk';
import { Step5_ImageGame } from './Step5_ImageGame';

type Point = { x: number; y: number };

export default function RotationMeetingContainer() {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  // --- 시스템 단계 관리 ---
  const [currentStage, setCurrentStage] = useState<
    'PREPARE' | 'INTRO' | 'VOTE' | 'RESULT' | 'TALK_1_ON_1' | 'IMAGE_GAME' | 'IMAGE_GAME_RESULT'
  >('PREPARE');
  const [resultSubStage, setResultSubStage] = useState<'MALE_SIDE' | 'FEMALE_SIDE' | null>(null);
  const [currentNotice, setCurrentNotice] = useState<string | null>('Hello');
  const [displayText, setDisplayText] = useState('');
  const [noticeIndex, setNoticeIndex] = useState(0);

  // --- 타이머 상태 ---
  const [introTimer, setIntroTimer] = useState(20);
  const [voteTimer, setVoteTimer] = useState(10);
  const [resultTimer, setResultTimer] = useState(10);
  const [talkTimer, setTalkTimer] = useState(120);
  const [imageGameTimer, setImageGameTimer] = useState(10);
  const [imageResultTimer, setImageResultTimer] = useState(10);

  const [round, setRound] = useState(1);
  const [gameRound, setGameRound] = useState(1);
  const [activeSpeakerIdx, setActiveSpeakerIdx] = useState<number | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  // --- 데이터 및 좌표 ---
  const currentUser = { userId: 101, username: '개발자', gender: 'FEMALE' as 'MALE' | 'FEMALE' };
  const [participants, setParticipants] = useState([
    {
      id: 1,
      name: '남자 1호',
      gender: 'MALE',
      voteTo: 5,
      keywords: ['☕ 카페 투어'],
      badges: [] as string[],
    },
    {
      id: 2,
      name: '남자 2호',
      gender: 'MALE',
      voteTo: 4,
      keywords: ['🧗 클라이밍'],
      badges: [] as string[],
    },
    {
      id: 3,
      name: '남자 3호',
      gender: 'MALE',
      voteTo: 6,
      keywords: ['✈️ 세계 여행'],
      badges: [] as string[],
    },
    {
      id: 4,
      name: '여자 1호',
      gender: 'FEMALE',
      voteTo: 2,
      keywords: ['🎨 전시회'],
      badges: [] as string[],
    },
    {
      id: 5,
      name: '여자 2호',
      gender: 'FEMALE',
      voteTo: 1,
      keywords: ['🎾 테니스'],
      badges: ['인기쟁이'],
    },
    {
      id: 6,
      name: '여자 3호',
      gender: 'FEMALE',
      voteTo: 1,
      keywords: ['🎥 영화 감상'],
      badges: [] as string[],
    },
  ]);

  const anchorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [lines, setLines] = useState<any[]>([]);

  const msgs = [
    'Hello',
    '안녕하세요, 라운디입니다.',
    '로테이션 소개팅에 오신 걸 환영합니다.',
    '이제 자기소개를 시작합니다.',
  ];

  const { isReady, handleReady } = useRotation('room_1', {
    ...currentUser,
    mode: 'FREE_TALK',
    username: '개발자',
  });

  // 1. 공지 시퀀스
  useEffect(() => {
    if (noticeIndex < msgs.length) {
      const t = setTimeout(
        () => {
          setCurrentNotice(msgs[noticeIndex]);
          setNoticeIndex((prev) => prev + 1);
        },
        noticeIndex === 0 ? 500 : 3000,
      );
      return () => clearTimeout(t);
    } else if (currentStage === 'PREPARE') {
      const t = setTimeout(() => {
        setCurrentNotice(null);
        setCurrentStage('INTRO');
        setActiveSpeakerIdx(0);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [noticeIndex, currentStage]);

  // 2. 타이핑 애니메이션
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

  // 3. 통합 타이머 로직 (TS2345 에러 해결 버전)
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (!currentNotice) {
      if (currentStage === 'INTRO') {
        timerId = setInterval(() => {
          setIntroTimer((p) => {
            if (p <= 1) {
              handleNextSpeaker();
              return 20;
            }
            return p - 1;
          });
        }, 1000);
      } else if (currentStage === 'VOTE') {
        timerId = setInterval(() => {
          setVoteTimer((p) => {
            if (p <= 1) {
              goToResultStage();
              return 0;
            }
            return p - 1;
          });
        }, 1000);
      } else if (currentStage === 'RESULT') {
        timerId = setInterval(() => {
          setResultTimer((p) => {
            if (p <= 1) {
              if (resultSubStage === 'MALE_SIDE') {
                setResultSubStage('FEMALE_SIDE');
                return 10;
              } else {
                goToTalkStage();
                return 0;
              }
            }
            return p - 1;
          });
        }, 1000);
      } else if (currentStage === 'TALK_1_ON_1') {
        timerId = setInterval(() => {
          setTalkTimer((p) => {
            if (p <= 1) {
              if (round < 3) {
                setRound((r) => r + 1);
                return 120;
              } else {
                goToImageGameStage();
                return 0;
              }
            }
            return p - 1;
          });
        }, 1000);
      } else if (currentStage === 'IMAGE_GAME') {
        timerId = setInterval(() => {
          setImageGameTimer((p) => {
            if (p <= 1) {
              if (gameRound < 3) {
                setGameRound((r) => r + 1);
                return 10;
              } else {
                goToImageResultStage();
                return 0;
              }
            }
            return p - 1;
          });
        }, 1000);
      } else if (currentStage === 'IMAGE_GAME_RESULT') {
        timerId = setInterval(() => {
          setImageResultTimer((p) => {
            if (p <= 1) {
              setCurrentNotice('최종 결정 단계로 이동합니다.');
              return 0;
            }
            return p - 1;
          });
        }, 1000);
      }
    }
    return () => clearInterval(timerId!);
  }, [currentStage, currentNotice, round, gameRound, resultSubStage]);

  // 4. 좌표 계산
  const calculateCoordinates = () => {
    if (!svgRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const newLines: any[] = [];
    const isMale = resultSubStage === 'MALE_SIDE';
    const targets = isMale ? participants.slice(0, 3) : participants.slice(3, 6);
    targets.forEach((p, idx) => {
      const sEl = anchorRefs.current[isMale ? idx : idx + 3];
      const eEl = anchorRefs.current[p.voteTo - 1];
      if (sEl && eEl) {
        const s = sEl.getBoundingClientRect();
        const e = eEl.getBoundingClientRect();
        newLines.push({
          id: p.id,
          start: { x: s.left - svgRect.left + s.width / 2, y: s.top - svgRect.top + s.height / 2 },
          end: { x: e.left - svgRect.left + e.width / 2, y: e.top - svgRect.top + e.height / 2 },
          isReverse: !isMale,
        });
      }
    });
    setLines(newLines);
  };

  useLayoutEffect(() => {
    if (currentStage === 'RESULT') calculateCoordinates();
  }, [currentStage, resultSubStage]);

  // --- 보조 함수 ---
  const handleNextSpeaker = () => {
    if (activeSpeakerIdx !== null && activeSpeakerIdx < 5) {
      setActiveSpeakerIdx(activeSpeakerIdx + 1);
      setIntroTimer(20);
    } else {
      setCurrentStage('VOTE');
    }
  };
  const goToResultStage = () => {
    setCurrentNotice('결과를 공개합니다.');
    setTimeout(() => {
      setCurrentNotice(null);
      setCurrentStage('RESULT');
      setResultSubStage('MALE_SIDE');
    }, 3000);
  };
  const goToTalkStage = () => {
    setCurrentNotice('1:1 대화를 시작합니다.');
    setTimeout(() => {
      setCurrentNotice(null);
      setCurrentStage('TALK_1_ON_1');
    }, 3000);
  };
  const goToImageGameStage = () => {
    setCurrentNotice('5단계: 이미지 게임을 시작합니다.');
    setTimeout(() => {
      setCurrentNotice(null);
      setCurrentStage('IMAGE_GAME');
    }, 3000);
  };
  const goToImageResultStage = () => {
    setCurrentNotice('이미지 게임 결과를 공개합니다.');
    setTimeout(() => {
      setCurrentNotice(null);
      setCurrentStage('IMAGE_GAME_RESULT');
    }, 3000);
  };

  const handleSkip = () => {
    setCurrentNotice(null);
    setSelectedCard(null);
    if (currentStage === 'PREPARE') setCurrentStage('INTRO');
    else if (currentStage === 'INTRO') setCurrentStage('VOTE');
    else if (currentStage === 'VOTE') goToResultStage();
    else if (currentStage === 'RESULT') {
      if (resultSubStage === 'MALE_SIDE') setResultSubStage('FEMALE_SIDE');
      else goToTalkStage();
    } else if (currentStage === 'TALK_1_ON_1') {
      if (round < 3) setRound((r) => r + 1);
      else goToImageGameStage();
    } else if (currentStage === 'IMAGE_GAME') {
      if (gameRound < 3) setGameRound((r) => r + 1);
      else goToImageResultStage();
    }
  };

  return (
    <div className="h-screen w-full bg-[#0F0F0F] text-white flex flex-col font-['Pretendard'] overflow-hidden">
      <header className="flex items-center justify-between px-8 py-4 bg-black/40 backdrop-blur-md z-30">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-[#FF4D94] rounded-md rotate-45" />
          <span className="text-xs font-bold text-[#FF4D94] uppercase tracking-widest">
            {currentStage === 'PREPARE' && '준비 단계'}
            {currentStage === 'INTRO' && '1단계: 자기소개'}
            {currentStage === 'VOTE' && '2단계: 첫인상 투표'}
            {currentStage === 'RESULT' && '3단계: 투표 결과'}
            {currentStage === 'TALK_1_ON_1' && `4단계: 1:1 대화 (${round}/3)`}
            {currentStage === 'IMAGE_GAME' && `5단계: 이미지 게임 (${gameRound}/3)`}
            {currentStage === 'IMAGE_GAME_RESULT' && '5단계: 결과 공개'}
          </span>
        </div>
        {!currentNotice && (
          <div className="absolute left-1/2 -translate-x-1/2 bg-white/5 px-6 py-2 rounded-full border border-white/10">
            <span className="text-2xl font-black text-[#FF4D94] tabular-nums">
              00:
              {(currentStage === 'TALK_1_ON_1'
                ? talkTimer
                : currentStage === 'IMAGE_GAME'
                  ? imageGameTimer
                  : introTimer
              )
                .toString()
                .padStart(2, '0')}
            </span>
          </div>
        )}
        <div className="flex items-center gap-4">
          <Settings size={20} />
          <button className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold uppercase">
            Exit
          </button>
        </div>
      </header>

      <main className="flex-1 p-8 relative flex flex-col items-center justify-center overflow-hidden">
        {currentNotice ? (
          <div className="absolute inset-0 flex items-center justify-center z-40 bg-[#0F0F0F]">
            <h2 className="text-4xl md:text-6xl font-black text-white text-center leading-tight">
              {displayText.split(/(라운디)/g).map((part, i) =>
                part === '라운디' ? (
                  <span key={i} className="text-[#FF4D94]">
                    {part}
                  </span>
                ) : (
                  part
                ),
              )}
            </h2>
          </div>
        ) : (
          <>
            {currentStage === 'INTRO' && (
              <Step1_Intro participants={participants} activeSpeakerIdx={activeSpeakerIdx} />
            )}
            {currentStage === 'VOTE' && (
              <Step2_Vote
                participants={participants}
                currentUser={currentUser}
                selectedCard={selectedCard}
                onSelect={setSelectedCard}
              />
            )}
            {currentStage === 'RESULT' && (
              <Step3_Result
                participants={participants}
                resultSubStage={resultSubStage}
                anchorRefs={anchorRefs}
                svgRef={svgRef}
                lines={lines}
              />
            )}
            {currentStage === 'TALK_1_ON_1' && (
              <Step4_Talk
                partner={
                  participants.filter((p) => p.gender !== currentUser.gender)[(round - 1) % 3]
                }
                round={round}
              />
            )}
            {(currentStage === 'IMAGE_GAME' || currentStage === 'IMAGE_GAME_RESULT') && (
              <Step5_ImageGame
                gameRound={gameRound}
                participants={participants}
                currentUser={currentUser}
                selectedCard={selectedCard}
                onSelect={setSelectedCard}
                isResult={currentStage === 'IMAGE_GAME_RESULT'}
              />
            )}
          </>
        )}
      </main>

      <footer className="p-8 flex justify-between items-end z-30">
        <button
          onClick={handleSkip}
          className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-black"
        >
          <FastForward size={16} className="text-[#FF4D94]" /> NEXT STAGE SKIP
        </button>
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-4 flex items-center gap-8 shadow-2xl">
          <div className="flex gap-3 pr-8 border-r border-white/10">
            <button
              onClick={() => setIsMicOn(!isMicOn)}
              className={`p-3 rounded-2xl ${isMicOn ? 'bg-white/5' : 'bg-red-500/20 text-red-500'}`}
            >
              <Mic size={22} />
            </button>
            <button
              onClick={() => setIsCamOn(!isCamOn)}
              className={`p-3 rounded-2xl ${isCamOn ? 'bg-white/5' : 'bg-red-500/20 text-red-500'}`}
            >
              <Video size={22} />
            </button>
          </div>
          <div className="px-4 text-center font-black text-white uppercase tracking-widest text-sm">
            {currentUser.username}
          </div>
        </div>
      </footer>
    </div>
  );
}
