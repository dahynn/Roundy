import React from 'react';
import { User, Heart } from 'lucide-react';

export const Step3_Result = ({ participants, resultSubStage, anchorRefs, svgRef, lines }: any) => (
  <div className="w-full max-w-5xl h-full relative flex items-center justify-between py-10 animate-in fade-in">
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"
    >
      {lines.map((line: any) => (
        <g key={line.id} className="animate-in fade-in duration-500">
          <line
            x1={line.start.x}
            y1={line.start.y}
            x2={line.end.x}
            y2={line.end.y}
            stroke="#FF4D94"
            strokeWidth="3"
            className="opacity-60 stroke-dasharray-[1000] stroke-dashoffset-[1000] animate-[draw_1s_ease-out_forwards]"
          />
          <circle cx={line.end.x} cy={line.end.y} r="4" fill="#FF4D94" className="animate-pulse" />
          <foreignObject
            x={line.isReverse ? line.end.x + 5 : line.end.x - 35}
            y={line.end.y - 15}
            width="30"
            height="30"
          >
            <Heart
              size={20}
              fill="#FF4D94"
              stroke="none"
              className="drop-shadow-[0_0_8px_rgba(255,77,148,0.8)]"
            />
          </foreignObject>
        </g>
      ))}
    </svg>
    <div className="flex flex-col justify-around h-full z-10 w-full">
      {participants.slice(0, 3).map((p: any, i: number) => (
        <ResultProfile
          key={p.id}
          participant={p}
          isActive={resultSubStage === 'MALE_SIDE'}
          anchorRef={(el: any) => (anchorRefs.current[i] = el)}
          isLeft={false}
        />
      ))}
    </div>
    <div className="flex flex-col justify-around h-full z-10 w-full items-end">
      {participants.slice(3, 6).map((p: any, i: number) => (
        <ResultProfile
          key={p.id}
          participant={p}
          isActive={resultSubStage === 'FEMALE_SIDE'}
          anchorRef={(el: any) => (anchorRefs.current[i + 3] = el)}
          isLeft={true}
        />
      ))}
    </div>
  </div>
);

const ResultProfile = ({ participant, isActive, anchorRef, isLeft }: any) => (
  <div className="relative flex flex-col items-center gap-4 w-32">
    <div
      className={`w-28 h-28 rounded-full border-4 flex items-center justify-center bg-gray-900 transition-all ${isActive ? 'border-[#FF4D94] shadow-[0_0_30px_rgba(255,77,148,0.4)]' : 'border-white/10'}`}
    >
      <User size={40} className={isActive ? 'text-[#FF4D94]' : 'text-white/10'} />
    </div>
    <div
      className={`relative px-5 py-2 rounded-full border text-xs font-black transition-all ${isActive ? 'bg-[#FF4D94] border-none text-white' : 'bg-white/5 border-white/10 text-white/40'}`}
    >
      {participant.name}
      <div
        ref={anchorRef}
        className={`absolute top-1/2 w-1 h-1 bg-transparent ${isLeft ? '-left-2' : '-right-2'}`}
      />
    </div>
  </div>
);
