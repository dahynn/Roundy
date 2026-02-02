import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { getPreferences } from '@/api/preference';

// ✅ 타입 정의
type PreferenceType =
  | 'RELATIONSHIP_GOAL'
  | 'DATING_STYLE'
  | 'DATE_PREFERENCE'
  | 'PERSONALITY'
  | 'APPEARANCE'
  | 'TALENT';

interface PreferenceItem {
  id: number;
  type: PreferenceType;
  content: string;
}

const UI_SECTIONS: { type: PreferenceType; title: string; limit: number; icon: string }[] = [
  { type: 'RELATIONSHIP_GOAL', title: '연애 목표', limit: 2, icon: '🎯' },
  { type: 'DATING_STYLE', title: '데이트 스타일', limit: 2, icon: '✨' },
  { type: 'DATE_PREFERENCE', title: '선호 데이트', limit: 3, icon: '🌇' },
  { type: 'PERSONALITY', title: '성격', limit: 2, icon: '💭' },
  { type: 'APPEARANCE', title: '외모', limit: 3, icon: '🐱' },
  { type: 'TALENT', title: '재능/특기', limit: 2, icon: '🎨' },
];

export default function PreferenceForm({
  onBack,
  onSubmit,
  initialSelectedIds = [],
  submitLabel = '가입 완료',
  showStepHeader = true,
}: {
  onBack: () => void;
  onSubmit: (ids: string[]) => void;
  initialSelectedIds?: number[];
  submitLabel?: string;
  showStepHeader?: boolean;
}) {
  const [serverItems, setServerItems] = useState<PreferenceItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1); // 1 or 2
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 페이지 변경 시 최상단으로 스크롤 이동
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  // 초기값이 변경될 때(서버에서 가져온 뒤) 상태 업데이트
  useEffect(() => {
    if (initialSelectedIds.length > 0) {
      setSelectedIds(initialSelectedIds);
    }
  }, [initialSelectedIds]);

  // ✅ 데이터 호출
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setIsLoading(true);
        const finalData: any = await getPreferences();
        setServerItems(finalData || []);
      } catch (error) {
        console.error('데이터 호출 에러:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPreferences();
  }, []);

  // ✅ 데이터 그룹화
  const groupedItems = useMemo(() => {
    const groups: Partial<Record<PreferenceType, PreferenceItem[]>> = {};
    serverItems.forEach((item) => {
      if (!groups[item.type]) groups[item.type] = [];
      groups[item.type]!.push(item);
    });
    return groups;
  }, [serverItems]);

  // ✅ 각 페이지별 섹션 구성
  const pageSections = useMemo(() => {
    if (currentPage === 1) return UI_SECTIONS.slice(0, 3);
    return UI_SECTIONS.slice(3, 6);
  }, [currentPage]);

  // ✅ 현재 페이지 선택 상태 체크
  const isPageComplete = useMemo(() => {
    return pageSections.every(section => {
      const items = groupedItems[section.type] || [];
      const sectionIds = items.map(i => i.id);
      const selectedInSection = selectedIds.filter(id => sectionIds.includes(id)).length;
      return selectedInSection === section.limit;
    });
  }, [pageSections, groupedItems, selectedIds]);

  const toggleItem = (id: number, type: string, limit: number) => {
    const sectionItems = serverItems.filter((i) => i.type === type);
    const currentCount = selectedIds.filter((sid) => sectionItems.some((i) => i.id === sid)).length;

    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    } else if (currentCount < limit) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleNext = () => {
    if (currentPage === 1 && isPageComplete) {
      setCurrentPage(2);
    }
  };

  const handlePrev = () => {
    if (currentPage === 2) {
      setCurrentPage(1);
    } else {
      onBack();
    }
  };

  return (
    <div className="w-full flex flex-col items-center animate-in fade-in duration-700">
      {showStepHeader && (
        <div className="w-full max-w-2xl flex items-center justify-between mb-8 px-4">
          <button
            type="button"
            onClick={handlePrev}
            className="p-3 bg-white/50 backdrop-blur-md border border-white/50 rounded-full hover:bg-white hover:shadow-lg transition-all active:scale-90"
          >
            <ChevronLeft size={24} className="text-gray-600" />
          </button>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-[#FF4D94] uppercase tracking-widest mb-1">Step 03</span>
            <h2 className="text-xl font-black text-[#1A1F36] transition-colors tracking-tight">취향 분석 ({currentPage}/2)</h2>
          </div>
        </div>
      )}

      <div className={`w-full max-w-2xl bg-white/70 dark:bg-black/40 backdrop-blur-3xl border border-white dark:border-white/10 rounded-[48px] p-8 md:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] flex flex-col h-[75vh] relative overflow-hidden transition-all duration-500 ${!showStepHeader ? 'mt-4' : ''}`}>
        {/* 장식용 글로우 배경 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-100/30 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-100/30 blur-[100px] rounded-full -ml-32 -mb-32 pointer-events-none" />

        {/* 상단 페이지 인디케이터 */}
        <div className="flex justify-center gap-2 mb-8 relative z-10">
          {[1, 2].map((p) => (
            <div
              key={p}
              className={`h-1.5 rounded-full transition-all duration-500 ${p === currentPage ? 'w-10 bg-gradient-to-r from-[#FF4D94] to-[#7C3AED]' : 'w-2 bg-gray-200'
                }`}
            />
          ))}
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto no-scrollbar scroll-smooth pr-1 relative">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-full gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-pink-100 border-t-[#FF4D94] rounded-full animate-spin" />
                <Sparkles size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#FF4D94] animate-pulse" />
              </div>
              <p className="text-gray-400 font-bold animate-pulse">취향 데이터를 분석하는 중...</p>
            </div>
          ) : serverItems.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-bold">
              데이터를 불러올 수 없습니다.
            </div>
          ) : (
            <div key={currentPage} className="animate-in slide-in-from-right-10 fade-in duration-500 space-y-12 pt-4 px-2 pb-10">
              <div className="mb-8">
                <h3 className="text-2xl font-black text-[#1A1F36] dark:text-white mb-2">
                  {currentPage === 1 ? '나의 연애 가치관 💝' : '나만의 매력 포인트 ✨'}
                </h3>
                <p className="text-sm text-gray-400 font-medium">각 항목별로 필수로 선택해 주세요.</p>
              </div>

              {pageSections.map((section, idx) => {
                const items = groupedItems[section.type] || [];
                const currentSectionIds = items.map((i) => i.id);
                const selectedCountInfo = selectedIds.filter((id) =>
                  currentSectionIds.includes(id),
                ).length;
                const isSectionFull = selectedCountInfo >= section.limit;

                return (
                  <section
                    key={section.type}
                    className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="flex items-center justify-between mb-6 px-1">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{section.icon}</span>
                        <h4 className="font-black text-[#1A1F36] dark:text-white text-xl tracking-tight">{section.title}</h4>
                      </div>
                      <div className={`
                        px-4 py-1.5 rounded-2xl text-xs font-black transition-all duration-300
                        ${selectedCountInfo === section.limit
                          ? 'bg-[#FF4D94] text-white shadow-lg shadow-pink-100'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-400'}
                      `}>
                        {selectedCountInfo} / {section.limit}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {items.map((item) => {
                        const isSelected = selectedIds.includes(item.id);
                        const isDisabled = !isSelected && isSectionFull;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleItem(item.id, section.type, section.limit)}
                            disabled={isDisabled}
                            className={`
                              px-6 py-3.5 rounded-2xl text-[15px] font-bold border-2 transition-all duration-300 flex items-center gap-2 group relative
                              ${isSelected
                                ? 'border-[#FF4D94] text-[#FF4D94] bg-white dark:bg-gray-900 shadow-xl shadow-pink-100 dark:shadow-none scale-105 z-10'
                                : isDisabled
                                  ? 'border-transparent text-gray-300 bg-gray-50/50 cursor-not-allowed opacity-40'
                                  : 'border-transparent text-[#697386] bg-gray-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 hover:shadow-md hover:border-gray-200 dark:hover:border-white/20'
                              }
                            `}
                          >
                            {isSelected && (
                              <div className="animate-in zoom-in duration-300">
                                <Check size={18} strokeWidth={4} />
                              </div>
                            )}
                            {item.content}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/10 relative z-20">
          <div className="flex gap-4">
            {currentPage === 2 && (
              <Button
                type="button"
                onClick={handlePrev}
                className="w-24 py-8 rounded-[24px] bg-gray-50 dark:bg-white/5 text-gray-500 font-black hover:bg-gray-100 transition-all font-['Pretendard']"
              >
                이전
              </Button>
            )}

            <Button
              type="button"
              disabled={!isPageComplete}
              onClick={currentPage === 1 ? handleNext : () => onSubmit(selectedIds.map((id) => id.toString()))}
              className={`
                flex-1 py-8 rounded-[28px] text-xl font-black transition-all transform active:scale-[0.98] relative overflow-hidden group font-['Pretendard']
                ${isPageComplete
                  ? 'bg-gradient-to-r from-[#FF4D94] to-[#7C3AED] text-white shadow-[0_15px_30px_rgba(255,77,148,0.3)] hover:brightness-110'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }
              `}
            >
              {isPageComplete && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
              )}
              <span className="relative z-10 flex items-center justify-center gap-2">
                {currentPage === 1 ? (
                  <>다음으로 <ChevronRight size={20} /></>
                ) : (
                  submitLabel
                )}
              </span>
            </Button>
          </div>
          <p className="text-center text-[11px] font-bold text-gray-400 mt-5 uppercase tracking-widest opacity-60">
            {currentPage === 1 ? '1페이지: 나의 연애 가치관 설정' : '2페이지: 나의 매력 포인트 설정'}
          </p>
        </div>
      </div>
    </div>
  );
}
