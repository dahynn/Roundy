import React from 'react';
import { Home, Moon } from 'lucide-react';
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
            navigate('/home'); // 랜딩이 아닌 홈으로
        }
    };

    return (
        <div className="w-full min-h-screen bg-black flex items-center justify-center p-6 animate-in fade-in duration-1000">

            {/* 중앙 카드 */}
            <div className="relative max-w-md w-full">

                {/* 배경 글로우 효과 */}
                <div className="absolute inset-0 bg-gradient-to-br from-pink-900/20 via-purple-900/10 to-transparent rounded-3xl blur-3xl" />

                {/* 메인 카드 */}
                <div className="relative bg-gradient-to-b from-zinc-900/90 to-black/95 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-2xl">

                    {/* 초승달 아이콘 */}
                    <div className="flex justify-center mb-8 animate-in zoom-in duration-700 delay-200">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border border-white/5 flex items-center justify-center">
                            <Moon size={48} className="text-zinc-400" strokeWidth={1.5} />
                        </div>
                    </div>

                    {/* MATCH CONCLUDED */}
                    <div className="text-center mb-6 animate-in slide-in-from-bottom-4 duration-700 delay-300">
                        <h2 className="text-xl md:text-2xl font-black tracking-wider text-[#8B5A7C] mb-2">
                            MATCH CONCLUDED
                        </h2>
                        <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-[#8B5A7C]/40 to-transparent mx-auto" />
                    </div>

                    {/* 메인 메시지 */}
                    <div className="text-center mb-4 animate-in slide-in-from-bottom-4 duration-700 delay-500">
                        <p className="text-xl md:text-2xl font-bold text-white mb-3">
                            아쉽지만 이번 인연은<br />여기까지예요.
                        </p>
                    </div>

                    {/* 설명 글 */}
                    <div className="text-center mb-10 animate-in slide-in-from-bottom-4 duration-700 delay-700">
                        <p className="text-sm md:text-base text-zinc-400/80 leading-relaxed">
                            새로운 만남은 언제든 다시 시작할 수 있어요.<br />
                            다음 기회에 더 멋진 인연을 만나보세요.
                        </p>
                    </div>

                    {/* 홈으로 돌아가기 버튼 */}
                    <div className="animate-in slide-in-from-bottom-4 duration-700 delay-900">
                        <button
                            onClick={handleGoHome}
                            className="w-full group relative overflow-hidden rounded-2xl bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 hover:border-zinc-600/50 px-6 py-4 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {/* 버튼 호버 효과 */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

                            <div className="relative flex items-center justify-center gap-3">
                                <Home size={20} className="text-zinc-400 group-hover:text-zinc-300 transition-colors" />
                                <span className="text-base font-bold text-zinc-300 group-hover:text-white transition-colors">
                                    홈으로 돌아가기
                                </span>
                            </div>
                        </button>
                    </div>

                    {/* 장식 요소 */}
                    <div className="absolute -top-1 -right-1 w-20 h-20 bg-gradient-to-br from-pink-500/10 to-transparent rounded-full blur-2xl" />
                    <div className="absolute -bottom-1 -left-1 w-20 h-20 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-2xl" />
                </div>
            </div>
        </div>
    );
};
