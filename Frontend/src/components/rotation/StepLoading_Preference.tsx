import React, { useEffect, useState } from 'react';
import { Sparkles, Wine, Home, Dog, User, Loader2 } from 'lucide-react';

interface PreferenceLoadingProps {
    partnerName: string;
    mySucces: boolean; // For 'You' connection status check simulation
    timeLeft: number;
    partnerId: number; // To simulate fetching data
}

// Mock API Response Type
interface PreferenceData {
    RELATIONSHIP_GOAL: string[];
    DATING_STYLE: string[];
    DATE_PREFERENCE: string[];
    PERSONALITY: string[];
    APPEARANCE: string[];
    TALENT: string[];
}

export const StepLoading_Preference = ({
    partnerName,
    mySucces = true,
    timeLeft,
    partnerId
}: PreferenceLoadingProps) => {
    const [preferences, setPreferences] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Simulate API Fetch
    useEffect(() => {
        // In a real scenario, fetch from /api/preferences/{partnerId}
        const fetchPreferences = async () => {
            setLoading(true);
            // Mock delay
            await new Promise(resolve => setTimeout(resolve, 800));

            // Mock Data based on provided API example
            const mockResponse = {
                success: true,
                data: {
                    preferences: {
                        RELATIONSHIP_GOAL: ["결혼 의향도 있어요", "진지한 연애"],
                        DATING_STYLE: ["다정한 스킨십", "상대한테 맞춰줘요"],
                        DATE_PREFERENCE: ["집에서 놀기", "근교 드라이브하기", "요리해먹기"],
                        PERSONALITY: ["웃음이 많아요", "예의가 발라요"],
                        APPEARANCE: ["강아지상", "고양이상", "눈웃음"],
                        TALENT: ["이야기를 잘 들어줘요", "대화를 잘 이끌어요"]
                    }
                }
            };

            // Flatten and select 4 random keywords to display like the screenshot
            const allTags = [
                ...mockResponse.data.preferences.DATE_PREFERENCE,
                ...mockResponse.data.preferences.DATING_STYLE,
                ...mockResponse.data.preferences.PERSONALITY
            ];

            // Shuffle and pick 4
            const shuffled = allTags.sort(() => 0.5 - Math.random());
            setPreferences(shuffled.slice(0, 4));
            setLoading(false);
        };

        fetchPreferences();
    }, [partnerId]);

    // Icons mapping for visual flair (optional)
    const getIconForTag = (tag: string) => {
        if (tag.includes('술')) return <Wine size={14} />;
        if (tag.includes('집')) return <Home size={14} />;
        if (tag.includes('동물') || tag.includes('강아지') || tag.includes('고양이')) return <Dog size={14} />;
        return <Sparkles size={14} />;
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-700 relative z-10">

            {/* Title Section */}
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-black text-white mb-4 drop-shadow-2xl">
                    대화 전 상대방의 <span className="text-[#FF4D94]">취향</span>을 알려드릴게요
                </h2>
                <p className="text-white/40 text-lg font-medium">
                    곧 대화가 시작됩니다. 긴장을 풀고 준비하세요.
                </p>
            </div>

            {/* Main Content: Avatar - Card - Avatar */}
            <div className="flex items-center justify-center gap-8 md:gap-20 w-full max-w-5xl">

                {/* Left: YOU */}
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-[#1A1A1A] border-2 border-white/10 flex items-center justify-center relative overflow-hidden shadow-2xl">
                            <User size={48} className="text-white/20" />
                        </div>
                        {mySucces && (
                            <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-[#0F0F0F]" />
                        )}
                        {/* Outline Pulse */}
                        <div className="absolute inset-0 rounded-full border border-white/5 animate-[ping_3s_infinite]" />
                    </div>
                    <span className="text-xs font-bold text-white/40 tracking-widest">YOU</span>
                </div>

                {/* Center: Preference Card */}
                <div className="relative">
                    {/* Card Container */}
                    <div className="w-[340px] md:w-[400px] h-[280px] bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden group hover:border-[#FF4D94]/30 transition-colors">

                        {/* Header */}
                        <div className="flex flex-col items-center gap-1 mb-8 text-center bg-white/5 w-full py-4 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-2 text-[#FF4D94] font-bold text-sm">
                                <Sparkles size={16} fill="currentColor" />
                                상대방의 취향 키워드
                            </div>
                        </div>

                        {/* Keywords Grid */}
                        {loading ? (
                            <Loader2 className="w-8 h-8 text-[#FF4D94] animate-spin" />
                        ) : (
                            <div className="grid grid-cols-2 gap-3 w-full">
                                {preferences.map((tag, idx) => (
                                    <div key={idx} className="bg-[#2A2A2A] hover:bg-[#333] transition-colors rounded-full px-4 py-3 flex items-center justify-center gap-2 text-xs md:text-sm font-bold text-white/80 border border-white/5 shadow-inner">
                                        <span className="text-[#FF4D94] opacity-80">{getIconForTag(tag)}</span>
                                        <span className="truncate max-w-[120px]">{tag}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Decorative Elements */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF4D94]/50 to-transparent" />
                        <div className="absolute bottom-4 text-[10px] font-bold text-white/20 tracking-[0.2em] uppercase">
                            Matched Keywords
                        </div>
                    </div>
                </div>

                {/* Right: PARTNER */}
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-[#1A1A1A] to-[#000] border-2 border-dashed border-[#FF4D94]/30 flex items-center justify-center relative shadow-2xl">
                            <span className="text-4xl text-[#FF4D94]/50 font-black">?</span>
                        </div>
                        <div className="absolute bottom-1 right-1 w-6 h-6 bg-gray-600 rounded-full border-4 border-[#0F0F0F]" />
                        {/* Outline Pulse */}
                        <div className="absolute inset-0 rounded-full border border-[#FF4D94]/10 animate-[ping_3s_infinite] delay-700" />
                    </div>
                    <span className="text-xs font-bold text-white/40 tracking-widest">PARTNER</span>
                </div>

            </div>

            {/* Bottom Status */}
            <div className="mt-16 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/5 flex items-center gap-3">
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-[#FF4D94] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="w-1.5 h-1.5 bg-[#FF4D94] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-1.5 h-1.5 bg-[#FF4D94] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
                <span className="text-xs font-bold text-white/50 tracking-wider">CONNECTING VIDEO...</span>
            </div>

        </div>
    );
};
