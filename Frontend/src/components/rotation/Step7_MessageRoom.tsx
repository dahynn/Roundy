import React from 'react';
import { Heart, ArrowRight, Sparkles, MessageCircle, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Step7_MessageRoomProps {
    onGoToMessage?: () => void;
    isFaceRevealDeclined?: boolean;
}

export const Step7_MessageRoom: React.FC<Step7_MessageRoomProps> = ({ onGoToMessage, isFaceRevealDeclined = false }) => {
    const navigate = useNavigate();

    const handleNext = () => {
        if (onGoToMessage) {
            onGoToMessage();
        } else {
            console.log("Navigating to message room...");
            navigate('/message-room');
        }
    };

    return (
        <div className="absolute inset-0 z-10 w-full h-full bg-transparent text-white flex items-center justify-center p-6 relative overflow-hidden font-sans select-none">

            {/* --- Background: Deep Space Ambient --- */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Top Left: Deep Violet */}
                <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] bg-violet-900/20 rounded-full blur-[120px] animate-pulse" />
                {/* Bottom Right: Deep Rose */}
                <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-rose-900/20 rounded-full blur-[120px] animate-pulse delay-1000" />

                {/* Noise Texture */}
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            {/* --- Main Card --- */}
            <div className="relative z-10 w-full max-w-sm animate-in fade-in zoom-in duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]">

                {/* Glow Behind Card */}
                <div className={`
                    absolute inset-0 blur-3xl -z-10 transform scale-110 opacity-40 transition-colors duration-1000
                    ${isFaceRevealDeclined ? 'bg-emerald-500/10' : 'bg-pink-500/10'}
                `} />

                <div className="relative overflow-hidden bg-[#0f0f10]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 text-center shadow-2xl group">

                    {/* Top Lighting */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent shadow-[0_0_20px_rgba(255,255,255,0.1)]" />

                    {/* Icon Section */}
                    <div className="flex justify-center mb-10 relative">
                        {/* Floating Particles */}
                        <div className="absolute -top-4 -right-4 animate-bounce delay-700">
                            <Sparkles className="w-4 h-4 text-white/40" />
                        </div>
                        <div className="absolute -bottom-2 -left-2 animate-bounce delay-1000">
                            <Sparkles className="w-3 h-3 text-white/30" />
                        </div>

                        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-10">

                            {/* Inner Glow */}
                            <div className={`
                                absolute inset-0 rounded-full blur-md opacity-50
                                ${isFaceRevealDeclined ? 'bg-emerald-500/10' : 'bg-pink-500/10'}
                            `} />

                            {/* Animated Icon */}
                            <div className="relative">
                                {isFaceRevealDeclined ? (
                                    <Lock className="w-9 h-9 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.4)]" strokeWidth={1.5} />
                                ) : (
                                    <Heart className="w-10 h-10 text-pink-500 fill-pink-500 animate-pulse drop-shadow-[0_0_15px_rgba(236,72,153,0.6)]" strokeWidth={1.5} />
                                )}

                                <div className="absolute -right-1 -bottom-1 bg-[#0f0f10] rounded-full p-1.5 border border-white/10">
                                    <MessageCircle className="w-3 h-3 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Text Section */}
                    <div className="space-y-6 mb-12">
                        <div className="space-y-3">
                            {/* Status Badge */}
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 mb-2 backdrop-blur-sm">
                                <span className={`w-1.5 h-1.5 rounded-full ${isFaceRevealDeclined ? 'bg-emerald-500' : 'bg-pink-500'} animate-pulse`} />
                                <span className="text-[10px] font-bold tracking-[0.2em] text-white/50 uppercase">
                                    {isFaceRevealDeclined ? 'Private Match' : 'Perfect Match'}
                                </span>
                            </div>

                            <h1 className="text-3xl font-light text-white tracking-tight leading-tight">
                                {isFaceRevealDeclined ? (
                                    <>
                                        비밀스러운<br />
                                        <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                                            쪽지함
                                        </span>이 열렸습니다.
                                    </>
                                ) : (
                                    <>
                                        축하합니다!<br />
                                        <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">
                                            쪽지함
                                        </span>이 열렸습니다.
                                    </>
                                )}
                            </h1>
                        </div>

                        <div className="w-8 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent mx-auto" />

                        <p className="text-white/40 text-sm font-light leading-relaxed">
                            {isFaceRevealDeclined ? (
                                <>
                                    얼굴은 공개되지 않았지만,<br />
                                    진솔한 대화로 서로를 알아갈 수 있습니다.<br />
                                    천천히 인연을 만들어보세요.
                                </>
                            ) : (
                                <>
                                    서로의 진심이 통했습니다.<br />
                                    이제 더 깊은 대화를 나누고<br />
                                    특별한 인연을 이어가보세요!
                                </>
                            )}
                        </p>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleNext}
                        className="group relative w-full overflow-hidden rounded-2xl bg-white text-black font-bold py-4 px-6 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                    >
                        {/* Hover Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />

                        <div className="relative flex items-center justify-center gap-2 text-sm">
                            <span>쪽지함으로 이동</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                        </div>
                    </button>

                </div>
            </div>
        </div>
    );
};