import React from 'react';
import { User, MessageCircle } from 'lucide-react';

export const Step4_Talk = ({ partner }: any) => (
  <div className="w-full max-w-7xl h-full grid grid-cols-2 gap-6 animate-in duration-1000">
    <div className="relative rounded-[40px] border border-white/10 bg-gray-900/50 shadow-2xl">
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-3xl">
        <User size={120} className="text-[#FF4D94] opacity-20" />
      </div>
      <div className="absolute bottom-8 left-8 bg-black/60 px-5 py-2.5 rounded-2xl border border-white/10 text-xs font-black uppercase text-[#FF4D94]">
        YOU (나)
      </div>
    </div>
    <div className="relative rounded-[40px] border-2 border-[#FF4D94] bg-gray-900 shadow-[0_0_80px_rgba(255,77,148,0.15)]">
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-2xl">
        <div className="text-center">
          <div className="w-28 h-28 bg-[#FF4D94]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#FF4D94]/30 shadow-inner">
            <MessageCircle size={48} className="text-[#FF4D94] animate-bounce" />
          </div>
          <span className="text-2xl font-black text-white uppercase bg-black/40 px-6 py-2 rounded-full border border-white/5">
            {partner?.name}
          </span>
        </div>
      </div>
      <div className="absolute top-8 right-8 bg-[#FF4D94] px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse shadow-lg">
        Live Connecting
      </div>
    </div>
  </div>
);
