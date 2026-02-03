import React from 'react';
import { Heart, Home, Moon, Check, Lock } from 'lucide-react';

interface Step6Props {
    isSuccess: boolean;
    myInfo: any;
    partnerInfo: any;
    onGoHome: () => void;
    onAgreeReveal: () => void;
}

export const Step6_FinalResult = ({
    isSuccess,
    myInfo,
    partnerInfo,
    onGoHome,
    onAgreeReveal,
}: Step6Props) => {

    // --- 1. 매칭 실패 화면 (Fail) ---
    if (!isSuccess) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-1000 bg-[#0a0a0a] relative z-50">
                <div className="relative z-10 flex flex-col items-center gap-10">
                    <div className="w-full max-w-md bg-[#161616] border border-white/5 rounded-[40px] p-10 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[200px] bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
                        <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/10">
                            <Moon className="text-gray-400 fill-gray-400/20" size={32} />
                        </div>
                        <span className="text-[10px] font-bold text-[#FF4D94] tracking-[0.2em] mb-4 uppercase">
                            Match Concluded
                        </span>
                        <h2 className="text-2xl font-bold text-white mb-6">
                            아쉽지만 이번 인연은<br />여기까지예요.
                        </h2>
                        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                            오늘의 대화가 당신에게 좋은 기억으로 남았길 바라요.<br />
                            더 멋진 인연이 곧 찾아올 거예요!
                        </p>
                        <button
                            onClick={onGoHome}
                            className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center gap-2 text-white/70 text-sm font-bold transition-all hover:scale-105"
                        >
                            홈으로 돌아가기 <Home size={14} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- 2. 매칭 성공 초기 화면 (Result Success) ---
    return (
        <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-700 relative overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-pink-100 z-0" />
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 z-0 pointer-events-none" />

            {/* Content */}
            <div className="z-10 flex flex-col items-center gap-8 w-full max-w-4xl scale-90 md:scale-100 transition-transform">

                {/* Header UI */}
                <div className="flex flex-col items-center gap-2">
                    <div className="px-4 py-1.5 rounded-full bg-pink-200 text-pink-600 text-[10px] font-black tracking-widest uppercase">
                        Final 1:1 Match
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 drop-shadow-sm text-center">
                        최종 매칭 <span className="text-[#FF4D94]">성공!</span>
                    </h1>
                    <p className="text-gray-500 font-medium">두 분의 마음이 연결되었습니다.</p>
                </div>

                {/* Cards Container */}
                <div className="flex items-center justify-center gap-4 md:gap-12 w-full mt-4">

                    {/* My Card */}
                    <div className="relative group">
                        <div className="w-[200px] h-[280px] md:w-[260px] md:h-[360px] bg-gray-800 rounded-[32px] shadow-2xl flex items-center justify-center relative overflow-hidden border-4 border-white">
                            <span className="text-white/20 font-black text-6xl uppercase transform -rotate-12">YOU</span>
                            {/* Status Indicator */}
                            <div className="absolute bottom-4 right-4 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                <Check size={16} className="text-white" strokeWidth={4} />
                            </div>
                        </div>
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center text-gray-400 font-bold text-sm">
                            {myInfo?.username}
                        </div>
                    </div>

                    {/* Connection Line & Heart */}
                    <div className="flex flex-col items-center justify-center gap-2 relative z-20">
                        <div className="w-[1px] h-[100px] bg-gradient-to-b from-transparent via-[#FF4D94] to-transparent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50" />
                        <div className="w-16 h-16 bg-[#FF4D94] rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(255,77,148,0.4)] animate-[pulse_2s_infinite]">
                            <Heart size={32} className="text-white fill-white" />
                        </div>
                    </div>

                    {/* Partner Card (Blurred) */}
                    <div className="relative group">
                        <div className="w-[200px] h-[280px] md:w-[260px] md:h-[360px] bg-gray-900 rounded-[32px] shadow-2xl flex items-center justify-center relative overflow-hidden border-4 border-white">
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 opacity-30">
                                <span className="text-4xl font-serif text-white/50 italic leading-snug">Minimal<br />natural<br />soft<br />vitual</span>
                            </div>
                            <Lock size={48} className="text-white/40 mb-2 relative z-10" />

                            {/* Status Indicator (Question) */}
                            <div className="absolute bottom-4 left-4 w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg border-2 border-white/10">
                                <span className="text-white font-bold">?</span>
                            </div>
                        </div>
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center text-gray-400 font-bold text-sm">
                            {partnerInfo?.name}
                        </div>
                    </div>

                </div>

                {/* Bottom Action Sheet (Agreement) */}
                <div className="mt-8 bg-white rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.1)] p-8 w-full max-w-md animate-in slide-in-from-bottom-10 fade-in duration-700 border border-pink-100/50">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="px-4 py-1 bg-[#FF4D94] rounded-full text-white text-xs font-bold shadow-md transform -translate-y-2">
                            매칭 성공!!
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">
                            상대방에게 얼굴을 공개하시겠습니까?
                        </h3>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            서로 '동의'를 선택하시면 1분간 대화하며<br />
                            서로의 얼굴을 확인하실 수 있습니다.
                        </p>
                        <div className="flex w-full gap-3 mt-2">
                            <button
                                onClick={onAgreeReveal}
                                className="flex-1 py-3.5 bg-[#FF4D94] hover:bg-[#ff3385] text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                            >
                                동의
                            </button>
                            <button
                                onClick={onGoHome}
                                className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold rounded-2xl transition-all"
                            >
                                거절
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
