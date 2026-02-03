import React, { useState, useEffect } from 'react';
import { Heart, Mic, Video, VideoOff } from 'lucide-react';

interface Step7Props {
    myInfo: any;
    partnerInfo: any;
    onGoHome: () => void;
}

export const Step7_FaceReveal = ({ myInfo, partnerInfo, onGoHome }: Step7Props) => {
    const [internalPhase, setInternalPhase] = useState<'COUNTDOWN' | 'LIVE'>('COUNTDOWN');
    const [countdown, setCountdown] = useState(10);
    const [meetingTime, setMeetingTime] = useState(60);

    // Countdown & Timer Logic
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (internalPhase === 'COUNTDOWN') {
            timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        setInternalPhase('LIVE');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (internalPhase === 'LIVE') {
            timer = setInterval(() => {
                setMeetingTime((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [internalPhase]);

    // --- 1. 카운트다운 화면 ---
    if (internalPhase === 'COUNTDOWN') {
        return (
            <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center animate-in fade-in">
                <div className="text-[#FF4D94] font-black text-[120px] md:text-[200px] animate-pulse leading-none font-['Pretendard']">
                    {countdown}
                </div>
                <p className="text-white/50 text-xl font-bold mt-8 animate-bounce">
                    커플 매칭 성공! 얼굴 공개까지...
                </p>
            </div>
        );
    }

    // --- 2. 1:1 얼굴 공개 (LIVE SESSION) ---
    return (
        <div className="w-full h-full relative flex bg-black animate-in fade-in duration-1000 z-50">
            {/* Header Overlay */}
            <div className="absolute top-0 w-full h-20 bg-gradient-to-b from-black/80 to-transparent z-40 flex items-center justify-between px-8">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#FF4D94] animate-pulse" />
                    <span className="text-[#FF4D94] font-bold text-sm tracking-wider">LIVE SESSION</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-1 bg-white/10 rounded-full backdrop-blur-md border border-white/10">
                    <span className="text-white font-black tabular-nums text-xl">
                        00:{meetingTime.toString().padStart(2, '0')}
                    </span>
                </div>
            </div>

            {/* Split Screen Video */}
            <div className="flex-1 grid grid-cols-2 gap-1 p-4 h-full">
                {/* Left: Partner (Revealed) */}
                <div className="relative bg-gray-900 rounded-[32px] overflow-hidden border border-white/10 shadow-2xl">
                    {/* Placeholder for Video Feed */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center opacity-50">
                            <p className="text-6xl mb-4">👩🏻</p>
                            <p className="text-white font-bold text-xl">{partnerInfo?.name}</p>
                        </div>
                        {/* Floating Hearts Simulation */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute bottom-20 left-10 text-[#FF4D94] animate-[float_3s_ease-in-out_infinite] opacity-0" style={{ animationDelay: '0.5s' }}>♥</div>
                            <div className="absolute bottom-32 right-20 text-[#FF4D94] animate-[float_4s_ease-in-out_infinite] opacity-0" style={{ animationDelay: '1.2s' }}>♥</div>
                            <div className="absolute bottom-10 left-1/2 text-[#FF4D94] animate-[float_2.5s_ease-in-out_infinite] opacity-0" style={{ animationDelay: '2.0s' }}>♥</div>
                        </div>
                    </div>
                    <div className="absolute bottom-6 left-6 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl text-white font-bold text-sm border border-white/10">
                        {partnerInfo?.name}
                    </div>
                </div>

                {/* Right: Me (Revealed) */}
                <div className="relative bg-gray-800 rounded-[32px] overflow-hidden border border-white/10 shadow-2xl">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center opacity-50">
                            <p className="text-6xl mb-4">🧑🏻</p>
                            <p className="text-white font-bold text-xl">{myInfo?.username}</p>
                        </div>
                    </div>
                    <div className="absolute bottom-6 left-6 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl text-white font-bold text-sm border border-white/10">
                        {myInfo?.username} (나)
                    </div>
                </div>
            </div>

            {/* Central Heart Overlay */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
                <div className="relative">
                    <Heart size={80} className="text-[#FF4D94] fill-[#FF4D94] animate-pulse drop-shadow-[0_0_30px_rgba(255,77,148,0.6)]" />
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 text-center w-64">
                    <p className="text-white font-bold text-lg drop-shadow-md animate-bounce">
                        1분간의 만남이 시작됩니다
                    </p>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50 bg-black/40 backdrop-blur-xl p-2 rounded-full border border-white/10">
                <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 transition-transform">
                    <Mic size={20} />
                </button>
                <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 transition-transform">
                    <Video size={20} />
                </button>
                <button className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform" onClick={onGoHome}>
                    <VideoOff size={20} />
                </button>
            </div>
        </div>
    );
};
