import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import Header from '@/components/layout/Header';
import FAQItem from '@/components/support/FAQItem';
import { Skeleton } from '@/components/ui/skeleton';

const FAQS = [
    {
        id: 1,
        category: '매칭',
        question: '매칭은 어떤 기준으로 이루어지나요?',
        answer: 'Roundy의 매칭은 고도화된 AI 알고리즘을 통해 이루어집니다. 가입 시 입력하신 14가지 취향 데이터와 선호하는 연애 스타일을 분석하여, 당신과 가장 높은 싱크로율을 가진 상대방을 추천해 드립니다.',
    },
    {
        id: 2,
        category: '계정',
        question: '취향 정보는 나중에 수정할 수 있나요?',
        answer: '네, 마이페이지의 "취향 분석 수정" 메뉴를 통해 언제든지 수정하실 수 있습니다. 취향이 변함에 따라 매칭되는 상대방의 성향도 함께 업데이트됩니다.',
    },
    {
        id: 3,
        category: '보안',
        question: '프로필 사진 인증은 필수인가요?',
        answer: '신뢰할 수 있는 매칭 환경을 위해 프로필 사진 인증을 권장하고 있습니다. 인증된 회원은 상대방에게 더 높은 신뢰를 주며, 매칭 확률 또한 대폭 상승합니다.',
    },
    {
        id: 4,
        category: '이용',
        question: '매칭된 상대방과 어떻게 대화하나요?',
        answer: '매칭이 성사되면 하단 메뉴의 "메시지" 탭에서 대화방이 생성됩니다. 대화방에서는 텍스트 메시지와 다양한 이모지를 사용하여 자유롭게 소통하실 수 있습니다.',
    },
    {
        id: 5,
        category: '이용',
        question: '비매너 유저를 신고하고 싶어요.',
        answer: '대화방 우측 상단 메뉴 또는 사용자 프로필 하단의 "신고하기" 버튼을 통해 신고 접수가 가능합니다. Roundy 운영팀은 쾌적한 커뮤니티를 위해 24시간 모니터링을 진행하고 있습니다.',
    }
];

export default function FAQPage() {
    const navigate = useNavigate();
    const [openId, setOpenId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 600);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="h-full flex flex-col font-['Pretendard']">
            <Header />

            <main className="flex-1 overflow-y-auto p-6 md:p-10 no-scrollbar">
                <div className="max-w-3xl mx-auto pb-20">
                    <div className="flex items-center gap-4 mb-10 px-2 group animate-in fade-in duration-500">
                        <button
                            onClick={() => navigate('/mypage')}
                            className="p-3 bg-white dark:bg-white/5 hover:bg-[#7C3AED]/10 dark:hover:bg-[#7C3AED]/20 rounded-2xl transition-all shadow-sm border border-transparent hover:border-purple-200"
                        >
                            <ChevronLeft size={24} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-[#1A1F36] dark:text-white tracking-tight">자주 묻는 질문</h1>
                            <p className="text-sm font-bold text-[#7C3AED] mt-1">도움이 필요하신가요? 궁금한 점을 해결해 드립니다.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                {[1, 2, 3, 4].map((i) => (
                                    <Skeleton key={i} className="h-24 w-full rounded-[32px]" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {FAQS.map((faq) => (
                                    <FAQItem
                                        key={faq.id}
                                        category={faq.category}
                                        question={faq.question}
                                        answer={faq.answer}
                                        isOpen={openId === faq.id}
                                        onToggle={() => setOpenId(openId === faq.id ? null : faq.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {!isLoading && (
                        <div className="mt-16 bg-gradient-to-br from-[#7C3AED] to-[#FF4D94] rounded-[40px] p-10 text-center text-white shadow-2xl shadow-purple-200 dark:shadow-none relative overflow-hidden group animate-in zoom-in-95 duration-700">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32 group-hover:scale-125 transition-transform duration-700" />
                            <div className="relative z-10">
                                <h4 className="text-2xl font-black mb-2">원하는 답변을 찾지 못하셨나요?</h4>
                                <p className="text-white/80 font-bold mb-8">1:1 문의를 남겨주시면 정성껏 답변해 드리겠습니다.</p>
                                <button className="px-8 py-4 bg-white text-[#7C3AED] rounded-2xl font-black shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95">
                                    1:1 문의하기
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
