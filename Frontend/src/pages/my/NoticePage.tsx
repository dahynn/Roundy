import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import Header from '@/components/layout/Header';
import NoticeItem from '@/components/support/NoticeItem';
import { Skeleton } from '@/components/ui/skeleton';

const NOTICES = [
    {
        id: 1,
        title: 'Roundy 정식 서비스 런칭 안내',
        content: '안녕하세요, 취향 기반 매칭 서비스 Roundy입니다. 오랜 준비 끝에 정식 서비스를 시작하게 되었습니다. 여러분의 소중한 인연을 위해 항상 최선을 다하겠습니다.',
        date: '2026.02.01',
        isNew: true,
    },
    {
        id: 2,
        title: '신규 취향 분석 항목 업데이트 (2월)',
        content: '더욱 정교한 매칭을 위해 나의 매력 포인트 섹션에 새로운 취향 항목들이 추가되었습니다. 마이페이지에서 새로운 취향을 확인해보세요!',
        date: '2026.01.28',
        isNew: false,
    },
    {
        id: 3,
        title: '서비스 안정화를 위한 정기 점검 안내',
        content: '안정적인 서비스 제공을 위해 매주 수요일 새벽 3시부터 5시까지 시스템 정기 점검이 진행될 예정입니다. 이용에 참고 부탁드립니다.',
        date: '2026.01.20',
        isNew: false,
    },
    {
        id: 4,
        title: '개인정보 처리방침 개정 알림',
        content: '보안 강화 및 관련 법령 준수를 위해 개인정보 처리방침이 일부 개정되었습니다. 자세한 내용은 설정 메뉴의 정책란을 확인해주세요.',
        date: '2026.01.15',
        isNew: false,
    }
];

export default function NoticePage() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 500);
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
                            className="p-3 bg-white dark:bg-white/5 hover:bg-pink-50 dark:hover:bg-pink-900/10 rounded-2xl transition-all shadow-sm border border-transparent hover:border-pink-200"
                        >
                            <ChevronLeft size={24} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-[#1A1F36] dark:text-white tracking-tight">공지사항</h1>
                            <p className="text-sm font-bold text-[#FF4D94] mt-1">Roundy의 새로운 소식을 전해드립니다.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-32 w-full rounded-[32px]" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {NOTICES.map((notice) => (
                                    <NoticeItem
                                        key={notice.id}
                                        title={notice.title}
                                        content={notice.content}
                                        date={notice.date}
                                        isNew={notice.isNew}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {!isLoading && (
                        <div className="mt-12 text-center animate-in fade-in duration-1000">
                            <p className="text-gray-400 text-sm font-bold">이전 공지사항은 더보기에서 확인하실 수 있습니다.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
