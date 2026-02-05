import React, { useState, useEffect } from 'react';
import { Timer, Video, Mic, MicOff, VideoOff, MessageCircle } from 'lucide-react';

interface Step7_FaceRevealProps {
    onComplete: () => void;
}

export const Step7_FaceReveal: React.FC<Step7_FaceRevealProps> = ({ onComplete }) => {
    const [status, setStatus] = useState<'COUNTDOWN' | 'VIDEO_CHAT'>('COUNTDOWN');
    const [count, setCount] = useState(10);
    const [chatTime, setChatTime] = useState(60); // 1분

    // 카운트다운 로직
    useEffect(() => {
        if (status === 'COUNTDOWN') {
            if (count > 0) {
                const timer = setTimeout(() => setCount(c => c - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                setStatus('VIDEO_CHAT');
            }
        }
    }, [count, status]);

    // 영상 채팅 타이머 로직
    useEffect(() => {
        if (status === 'VIDEO_CHAT') {
            if (chatTime > 0) {
                const timer = setTimeout(() => setChatTime(t => t - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                onComplete();
            }
        }
    }, [chatTime, status, onComplete]);

    return (
        <div className="absolute inset-0 z-10 w-full h-full bg-transparent flex flex-col items-center justify-center overflow-hidden">

            {/* 카운트다운 페이즈 */}
            {status === 'COUNTDOWN' && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="relative">
                        {/* 펄스 효과 */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/20 rounded-full animate-ping duration-1000" />
                        <div className="relative z-10 text-[120px] font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-pink-200 to-pink-500 tabular-nums animate-bounce">
                            {count}
                        </div>
                    </div>
                    <p className="mt-8 text-2xl text-white/60 font-medium animate-pulse">
                        두근두근, 얼굴 공개까지...
                    </p>
                </div>
            )}

            {/* 비디오 채팅 페이즈 */}
            <div className={`w-full h-full flex flex-col transition-opacity duration-1000 ${status === 'VIDEO_CHAT' ? 'opacity-100' : 'opacity-0'}`}>

                {/* 상단 타이머 바 */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-6 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-white font-mono text-lg font-bold">
                        {Math.floor(chatTime / 60)}:{(chatTime % 60).toString().padStart(2, '0')}
                    </span>
                </div>

                {/* 비디오 그리드 */}
                <div className="flex-1 grid grid-cols-2 gap-4 p-4 md:p-8 max-w-7xl mx-auto w-full h-full items-center">

                    {/* 내 화면 */}
                    <VideoCard name="나 (User)" isMe={true} />

                    {/* 상대방 화면 */}
                    <VideoCard name="여자 1호" isMe={false} />

                </div>
            </div>
        </div>
    );
};

const VideoCard = ({ name, isMe }: { name: string, isMe: boolean }) => {
    return (
        <div className="relative w-full aspect-[4/3] md:aspect-video bg-zinc-800 rounded-3xl overflow-hidden shadow-2xl border border-white/5 group">
            {/* 가짜 비디오 피드 (placeholder) */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-900">
                <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center backdrop-blur-sm">
                    <Video size={48} className="text-white/20" />
                </div>
            </div>

            {/* 오버레이 정보 */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isMe ? 'bg-green-500' : 'bg-blue-500'}`} />
                        <span className="text-white font-bold text-lg">{name}</span>
                    </div>

                    <div className="flex gap-2">
                        <div className="p-2 rounded-full bg-white/10 backdrop-blur-md">
                            <Mic size={16} className="text-white" />
                        </div>
                        <div className="p-2 rounded-full bg-white/10 backdrop-blur-md">
                            <Video size={16} className="text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 하이라이트 효과 (오픈 시) */}
            <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" style={{ animationDuration: '0.5s', animationIterationCount: 1 }} />
        </div>
    );
};
