import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
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

const UI_SECTIONS: { type: PreferenceType; title: string; limit: number; color: string }[] = [
  { type: 'RELATIONSHIP_GOAL', title: '연애 목표', limit: 2, color: '#FF4D94' },
  { type: 'DATING_STYLE', title: '데이트 스타일', limit: 2, color: '#7C3AED' },
  { type: 'DATE_PREFERENCE', title: '선호 데이트', limit: 3, color: '#FFB800' },
  { type: 'PERSONALITY', title: '성격', limit: 2, color: '#10B981' },
  { type: 'APPEARANCE', title: '외모', limit: 3, color: '#3B82F6' },
  { type: 'TALENT', title: '재능/특기', limit: 2, color: '#F43F5E' },
];

export default function PreferenceForm({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit: (ids: string[]) => void;
}) {
  const [serverItems, setServerItems] = useState<PreferenceItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // ✅ 선택 토글 로직
  const toggleItem = (id: number, type: string, limit: number) => {
    const sectionItems = serverItems.filter((i) => i.type === type);
    const currentCount = selectedIds.filter((sid) => sectionItems.some((i) => i.id === sid)).length;

    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    } else if (currentCount < limit) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-2xl flex items-center mb-6 px-4">
        <button
          type="button"
          onClick={onBack}
          className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-sm hover:bg-white hover:shadow-md transition-all active:scale-95"
        >
          <ChevronLeft size={24} className="text-[#1A1F36]" />
        </button>
      </div>

      <div className="w-full max-w-2xl bg-white/90 backdrop-blur-3xl rounded-[50px] p-10 md:p-14 shadow-2xl flex flex-col h-[80vh] border border-white">
        {/* 헤더 부분 */}
        <div className="mb-10">
          <h1 className="text-3xl font-black text-[#1A1F36] mb-3">취향 수집</h1>
          <p className="text-gray-400 font-bold text-sm">마음에 드는 키워드를 선택해주세요!</p>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-12">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="animate-spin text-[#FF4D94]" size={40} />
            </div>
          ) : serverItems.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-bold">
              데이터를 불러올 수 없습니다.
            </div>
          ) : (
            UI_SECTIONS.map((section) => {
              const items = groupedItems[section.type] || [];
              const currentSectionIds = items.map((i) => i.id);
              const selectedCount = selectedIds.filter((id) =>
                currentSectionIds.includes(id),
              ).length;
              const isSectionFull = selectedCount >= section.limit;

              if (items.length === 0) return null;

              return (
                <section key={section.type} className="space-y-6">
                  {/* 마이페이지 스타일 헤더 */}
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-lg font-black text-[#1A1F36] flex items-center gap-3">
                      <div className="w-[4px] h-5 rounded-full" style={{ backgroundColor: section.color }} />
                      {section.title}
                    </h3>
                    <div className="bg-gray-50 px-3 py-1 rounded-lg">
                      <span className={`text-xs font-black ${isSectionFull ? 'text-[#FF4D94]' : 'text-gray-400'}`}>
                        {selectedCount} / {section.limit}
                      </span>
                    </div>
                  </div>

                  {/* 마이페이지 스타일 컨테이너 */}
                  <div className="bg-gray-50/50 rounded-[32px] p-6 border border-gray-100/50 shadow-inner">
                    <div className="flex flex-wrap gap-2.5">
                      {items.map((item) => {
                        const isSelected = selectedIds.includes(item.id);
                        const isDisabled = !isSelected && isSectionFull;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleItem(item.id, section.type, section.limit)}
                            disabled={isDisabled}
                            className={`px-5 py-3 rounded-2xl text-[13px] font-bold border-2 transition-all duration-300 ${isSelected
                              ? 'border-[#FF4D94] text-[#FF4D94] bg-white shadow-md shadow-pink-100 scale-105'
                              : isDisabled
                                ? 'border-transparent text-gray-300 bg-gray-100/50 cursor-not-allowed opacity-60'
                                : 'border-white text-gray-400 bg-white hover:border-[#FF4D94]/20 hover:text-[#FF4D94] shadow-sm'
                              }`}
                          >
                            {item.content}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );
            })
          )}
        </div>

        <div className="mt-8 border-t pt-6">
          <Button
            type="button"
            disabled={selectedIds.length !== 14}
            onClick={() => onSubmit(selectedIds.map((id) => id.toString()))}
            className={`w-full py-8 rounded-2xl text-xl font-black transition-all ${selectedIds.length === 14
              ? 'bg-[#FF4D94] text-white shadow-lg hover:bg-[#ff3385]'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
          >
            {selectedIds.length === 14 ? '가입 완료' : `${selectedIds.length} / 14 선택됨`}
          </Button>
        </div>
      </div>
    </div>
  );
}
