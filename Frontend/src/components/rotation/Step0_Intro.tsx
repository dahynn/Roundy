import React from 'react';

export const Step0_Intro: React.FC = () => {
    return (
        <div className="fixed inset-0 w-full h-full bg-black flex items-center justify-center overflow-hidden">
            {/* 배경 앰비언트 글로우 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FF4D94] rounded-full blur-[200px] opacity-[0.08] pointer-events-none animate-pulse" />

            {/* 하단 Roundy 로고 워터마크 */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-30 animate-in fade-in duration-1000 delay-500">
                <div className="w-8 h-8 bg-[#FF4D94] rounded-xl rotate-12 flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full" />
                </div>
                <span className="text-white text-xl font-black uppercase tracking-wider">Roundy</span>
            </div>
        </div>
    );
};
