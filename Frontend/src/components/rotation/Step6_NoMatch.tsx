import React from 'react';
import { Home, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Step6_NoMatchProps {
    onGoHome?: () => void;
}

export const Step6_NoMatch: React.FC<Step6_NoMatchProps> = ({ onGoHome }) => {
    const navigate = useNavigate();

    const handleGoHome = () => {
        if (onGoHome) {
            onGoHome();
        } else {
            navigate('/home');
        }
    };

    return (
        <div className="w-full h-full bg-transparent text-white flex items-center justify-center p-6 relative overflow-hidden font-sans select-none">

            {/* --- Background: Deep Void --- */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Subtle Ambient Light */}
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-white/5 rounded-full blur-[150px] opacity-20" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] opacity-20" />

                {/* Noise Texture */}
                <div className="absolute inset-0 opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            {/* --- Main Content --- */}
            <div className="relative z-10 w-full max-w-sm flex flex-col items-center animate-in fade-in zoom-in duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]">

                {/* Icon: User Not Found */}
                <div className="relative mb-12 group">
                    {/* Outer Rings */}
                    <div className="absolute inset-[-15px] border border-white/5 rounded-full animate-[spin_10s_linear_infinite]" />
                    <div className="absolute inset-[-8px] border border-white/10 rounded-full" />

                    {/* Main Circle */}
                    <div className="w-24 h-24 rounded-full bg-[#0a0a0a] border border-white/20 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.05)] relative z-10">
                        <UserX size={32} className="text-white/90" strokeWidth={1} />
                    </div>
                </div>

                {/* Typography */}
                <div className="text-center space-y-5 mb-14">

                    {/* Signal Lost Label */}
                    <p className="text-[10px] font-bold tracking-[0.3em] text-white/40 uppercase animate-pulse">
                        Signal Lost
                    </p>

                    <h1 className="text-5xl font-light text-white tracking-tighter">
                        Unmatched
                    </h1>

                    <div className="w-6 h-[1px] bg-white/30 mx-auto" />

                    <p className="text-white/60 text-sm font-light leading-relaxed">
                        이번 연결은 닿지 않았지만,<br />
                        당신의 이야기는 여기서 끝나지 않습니다.
                    </p>
                </div>

                {/* Action Button: Single & Bold */}
                <div className="w-full">
                    <button
                        onClick={handleGoHome}
                        className="group relative w-full py-4 rounded-full bg-white text-black font-bold text-sm overflow-hidden hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                    >
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <span className="relative flex items-center justify-center gap-2">
                            <Home size={16} /> 홈으로 이동
                        </span>
                    </button>
                </div>

            </div>
        </div>
    );
};