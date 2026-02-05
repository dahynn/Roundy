import React, { useState, useEffect } from 'react';
import { User, Heart, Sparkles, Check, X, Shield } from 'lucide-react';

interface Participant {
    id: number;
    name: string;
    gender: 'MALE' | 'FEMALE';
}

interface Step6_MatchSuccessProps {
    currentUser: Participant;
    matchedUser: Participant;
    onFaceRevealResponse: (agreed: boolean) => void;
}

export const Step6_MatchSuccess: React.FC<Step6_MatchSuccessProps> = ({
    currentUser,
    matchedUser,
    onFaceRevealResponse,
}) => {
    const [showConsent, setShowConsent] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setShowConsent(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="w-full h-full bg-transparent text-white flex flex-col items-center p-6 relative overflow-hidden font-sans select-none">

            {/* --- Background Effects --- */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-pink-600/10 rounded-full blur-[100px]" />
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            {/* --- Main Container: Flex로 상/중/하 분리 --- */}
            <div className="relative z-10 w-full max-w-md h-full flex flex-col justify-center items-center py-4">

                {/* 1. Top Section: Title & Badge */}
                <div className="flex flex-col items-center justify-center shrink-0 mb-6">
                    <div className="animate-in fade-in slide-in-from-top-4 duration-1000 delay-200 mb-4">
                        <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.05)] flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-pink-300" />
                            <span className="text-[10px] font-bold tracking-[0.2em] text-white/90 uppercase">Perfect Match</span>
                        </div>
                    </div>

                    <div className="text-center animate-in fade-in zoom-in duration-1000">
                        <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-2 drop-shadow-2xl">
                            Matched<span className="text-pink-500">.</span>
                        </h1>
                        <p className="text-white/40 text-sm font-medium tracking-wide">
                            마음의 주파수가 연결되었습니다.
                        </p>
                    </div>
                </div>

                {/* 2. Middle Section: Cards Interaction */}
                <div className="w-full flex items-center justify-center my-4 shrink-0">
                    <div className="relative flex items-center justify-center gap-4 md:gap-8 w-full">

                        {/* Connecting Beam */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[1px] bg-gradient-to-r from-transparent via-pink-500/50 to-transparent blur-[1px] animate-pulse" />

                        {/* Left Card (Me) */}
                        <ProfileCard participant={currentUser} isMe={true} delay={0} />

                        {/* Center Icon */}
                        <div className="relative z-20 shrink-0 animate-in zoom-in rotate-in duration-700 delay-500 mx-2">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500 p-[1px] shadow-[0_0_40px_rgba(236,72,153,0.5)]">
                                <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center">
                                    <Heart className="w-5 h-5 text-pink-500 fill-pink-500 animate-pulse" />
                                </div>
                            </div>
                        </div>

                        {/* Right Card (Matched) */}
                        <ProfileCard participant={matchedUser} isMe={false} delay={300} />
                    </div>
                </div>

                {/* 3. Bottom Section: Consent Modal */}
                <div className="w-full flex items-center justify-center mt-6">
                    <div className={`
                        w-full transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1)
                        ${showConsent ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95 pointer-events-none'}
                    `}>
                        <div className="relative bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden max-w-sm mx-auto">
                            {/* Top Border Shine */}
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mb-3">
                                    <Shield className="w-5 h-5 text-white/70" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">얼굴을 공개할까요?</h3>
                                <p className="text-white/40 text-xs leading-relaxed">
                                    서로 동의하면 <span className="text-white font-bold">1분간 영상 대화</span>가 시작됩니다.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => onFaceRevealResponse(false)}
                                    className="py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-medium text-sm transition-colors"
                                >
                                    거절하기
                                </button>
                                <button
                                    onClick={() => onFaceRevealResponse(true)}
                                    className="relative py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(255,255,255,0.1)] overflow-hidden group"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        <Check className="w-4 h-4" /> 공개하기
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-pink-200 to-indigo-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

// --- Profile Card ---
const ProfileCard = ({ participant, isMe, delay }: { participant: Participant, isMe: boolean, delay: number }) => {
    return (
        <div
            className="flex flex-col items-center gap-3 relative z-10"
            style={{
                animation: `cardFloat 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms backwards`
            }}
        >
            <div className="relative group">
                {/* Glow Ring */}
                <div className={`
                    absolute -inset-[1px] rounded-full bg-gradient-to-b 
                    ${isMe ? 'from-indigo-500/50 to-transparent' : 'from-pink-500/50 to-transparent'} 
                    blur-sm opacity-50 group-hover:opacity-100 transition-opacity duration-500
                `} />

                {/* Avatar Circle */}
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#111] border border-white/10 flex items-center justify-center overflow-hidden z-10">
                    <User size={32} className="text-white/30 group-hover:text-white/60 transition-colors" strokeWidth={1.5} />
                    <div className="absolute inset-0 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] pointer-events-none" />
                </div>

                {/* Badge */}
                {isMe && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 bg-[#1a1a1a] border border-white/10 rounded-full shadow-lg">
                        <span className="text-[9px] font-bold text-white/80 tracking-widest block">ME</span>
                    </div>
                )}
            </div>

            <span className="text-sm font-bold text-white/90 tracking-tight">
                {participant.name}
            </span>

            <style>{`
                @keyframes cardFloat {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};