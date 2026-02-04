import React, { useMemo } from 'react';
import { User, CheckCircle2, Trophy, AlertCircle } from 'lucide-react';

export const Step2_Vote = ({ participants, currentUser, selectedCard, onSelect }: any) => {

  // 1. 후보군 필터링
  const candidates = useMemo(() => {
    if (!participants || !currentUser) return [];

    return participants.filter((p: any) => {
      // 본인 제외
      if (p.id === currentUser.userId) return false;
      // 성별이 다른 참가자만 필터링
      return p.gender !== currentUser.gender;
    });
  }, [participants, currentUser]);

  return (
    <div className="flex flex-col items-center gap-10 animate-in fade-in zoom-in w-full">
      <h2 className="text-3xl md:text-5xl font-black text-center text-white">
        당신의 <span className="text-[#FF4D94]">마음</span>을 사로잡은 사람은?
      </h2>

      <div className="flex gap-8 max-w-6xl flex-wrap justify-center min-h-[440px]">
        {candidates.length > 0 ? (
          candidates.map((p: any) => (
            <VoteCard
              key={p.id}
              participant={p}
              isSelected={selectedCard === p.id}
              onClick={() => onSelect(p.id)}
            />
          ))
        ) : (
          /* 예외 처리 UI: 주석 위치를 태그 내부나 JSX 표현식 밖으로 이동해야 함 */
          <div className="flex flex-col items-center justify-center text-white/40 gap-4 p-10 border-2 border-dashed border-white/10 rounded-3xl bg-white/5 min-w-[300px]">
            <AlertCircle size={48} />
            <div className="text-xl font-bold">투표 가능한 이성 참가자가 없습니다</div>
            <p className="text-sm text-center">
              현재 접속 중인 이성 참가자가 없습니다.<br />
              다른 참가자가 입장할 때까지 기다려주세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// 투표 카드 컴포넌트 (변경 없음)
export const VoteCard = ({ participant, isSelected, onClick }: any) => {
  const displayNum = (participant.id % 99 || 1).toString().padStart(2, '0');

  return (
    <button
      onClick={onClick}
      className={`relative w-64 h-[440px] rounded-[32px] border-2 transition-all duration-300 group flex-shrink-0 ${isSelected
          ? 'border-[#FF4D94] bg-[#FF4D94]/5 scale-105 shadow-[0_0_40px_rgba(255,77,148,0.2)]'
          : 'border-white/10 bg-white/5 hover:border-white/30'
        }`}
    >
      <div className="absolute top-8 left-8 text-7xl font-black text-white/5 uppercase leading-none">
        {displayNum}
      </div>

      <div className="w-full h-full p-8 flex flex-col justify-end gap-6 relative z-10 text-center">
        <div className="flex flex-col items-center gap-4 py-4">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center bg-white/5 border border-white/10 ${isSelected ? 'bg-[#FF4D94]/20 border-[#FF4D94]/50' : ''
              }`}
          >
            <User size={48} className={isSelected ? 'text-[#FF4D94]' : 'text-white/20'} />
          </div>
        </div>

        <div className="space-y-4">
          <div
            className={`py-4 rounded-2xl font-black tracking-widest transition-all ${isSelected ? 'bg-[#FF4D94] text-white' : 'bg-white/10 text-white/50'
              }`}
          >
            {participant.name}
          </div>

          <div className="flex flex-wrap gap-2 justify-center min-h-[30px]">
            {participant.badges?.map((badge: string, i: number) => (
              <div
                key={i}
                className="flex items-center gap-1 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-[10px] font-black text-yellow-500"
              >
                <Trophy size={12} /> {badge}
              </div>
            ))}
          </div>
        </div>
      </div>

      {isSelected && (
        <div className="absolute top-6 right-6 animate-in zoom-in duration-300">
          <CheckCircle2 className="text-[#FF4D94]" size={28} />
        </div>
      )}
    </button>
  );
};