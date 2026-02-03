import React from 'react';
import { User, Mic } from 'lucide-react';

export const Step1_Intro = ({ participants, activeSpeakerIdx }: any) => (
  <div className="grid grid-rows-2 gap-8 w-full max-w-7xl h-full py-4 transition-all animate-in fade-in">
    <div className="grid grid-cols-3 gap-6">
      {participants.slice(0, 3).map((p: any, idx: number) => (
        <SpeakerCard key={p.id} participant={p} isActive={activeSpeakerIdx === idx} />
      ))}
    </div>
    <div className="grid grid-cols-3 gap-6">
      {participants.slice(3, 6).map((p: any, idx: number) => (
        <SpeakerCard key={p.id} participant={p} isActive={activeSpeakerIdx === idx + 3} />
      ))}
    </div>
  </div>
);

const SpeakerCard = ({ participant, isActive }: any) => (
  <div
    className={`relative w-full h-full rounded-[40px] border-2 transition-all duration-500 overflow-hidden ${isActive ? 'border-[#FF4D94] shadow-[0_0_40px_rgba(255,77,148,0.3)] scale-105 z-10' : 'border-white/5 bg-white/5'}`}
  >
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-800 to-gray-900">
      <User size={80} className={`transition-opacity ${isActive ? 'opacity-20' : 'opacity-10'}`} />
      {isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-[#FF4D94] rounded-full flex items-center justify-center shadow-lg animate-pulse">
            <Mic size={32} />
          </div>
        </div>
      )}
    </div>
    <div className="absolute top-6 left-8 flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#FF4D94]' : 'bg-white/20'}`} />
      <span className="text-xs font-black">{participant.name}</span>
    </div>
  </div>
);
