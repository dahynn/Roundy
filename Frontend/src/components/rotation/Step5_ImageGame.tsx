import React from 'react';
import { Sparkles, Trophy, User, CheckCircle2 } from 'lucide-react';

export const Step5_ImageGame = ({
  gameRound,
  participants,
  currentUser,
  selectedCard,
  onSelect,
  isResult,
}: any) => {
  const questions = [
    { q: '학창시절 가장 인기가 많았을 것 같은 사람은?', badge: '인기쟁이' },
    { q: '애인에게 가장 다정하게 잘해줄 것 같은 사람은?', badge: '사랑꾼' },
    { q: '오늘 입은 옷이 가장 본인과 잘 어울리는 사람은?', badge: '패션피플' },
  ];

  if (isResult) {
    return (
      <div className="flex flex-col items-center gap-8 animate-in fade-in">
        <Trophy className="text-yellow-500 mb-2" size={64} />
        <h2 className="text-4xl font-black mb-10">
          이벤트 결과 <span className="text-[#FF4D94]">New Badges</span>
        </h2>
        <div className="grid grid-cols-2 gap-8">
          {/* 결과 시뮬레이션: 각 성별 1위 노출 */}
          {[participants[1], participants[4]].map((p) => (
            <div
              key={p.id}
              className="bg-white/5 border-2 border-yellow-500/50 p-8 rounded-[32px] text-center scale-110"
            >
              <div className="w-24 h-24 rounded-full bg-gray-800 mx-auto mb-4 flex items-center justify-center border-4 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                <User size={48} className="text-yellow-500" />
              </div>
              <span className="text-xl font-black text-white">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-10 w-full animate-in zoom-in">
      <div className="bg-white/5 border border-white/10 px-12 py-8 rounded-[40px] text-center shadow-2xl relative max-w-4xl">
        <Sparkles className="text-[#FF4D94] mb-4 mx-auto" size={32} />
        <h2 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">
          {questions[gameRound - 1]?.q}
        </h2>
      </div>
      <div className="flex gap-6 max-w-7xl overflow-x-auto pb-4 scrollbar-hide">
        {/* [로직 1] 남자는 여자만, 여자는 남자만 필터링 */}
        {participants
          .filter((p: any) => p.gender !== currentUser.gender)
          .map((p: any) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`relative w-64 h-[440px] rounded-[32px] border-2 transition-all duration-300 group flex-shrink-0 ${selectedCard === p.id ? 'border-[#FF4D94] bg-[#FF4D94]/5 scale-105' : 'border-white/10 bg-white/5'}`}
            >
              <div className="w-full h-full p-8 flex flex-col justify-end gap-6 relative z-10 text-center">
                <div className="w-24 h-24 rounded-full bg-white/5 mx-auto flex items-center justify-center">
                  <User
                    size={48}
                    className={selectedCard === p.id ? 'text-[#FF4D94]' : 'text-white/20'}
                  />
                </div>
                <div className="py-4 rounded-2xl font-black tracking-widest bg-white/5 text-white/50">
                  {p.name}
                </div>
                {/* [로직 2] 기존 획득 배지 유지 표시 */}
                <div className="flex flex-wrap gap-1 justify-center min-h-[30px]">
                  {p.badges?.map((badge: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-[10px] font-black text-yellow-500"
                    >
                      <Trophy size={10} /> {badge}
                    </div>
                  ))}
                </div>
              </div>
              {selectedCard === p.id && (
                <CheckCircle2 className="absolute top-6 right-6 text-[#FF4D94]" size={28} />
              )}
            </button>
          ))}
      </div>
    </div>
  );
};
