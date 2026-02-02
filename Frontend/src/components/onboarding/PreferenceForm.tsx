import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import api from '@/utils/api';

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

const UI_SECTIONS: { type: PreferenceType; title: string; limit: number }[] = [
  { type: 'RELATIONSHIP_GOAL', title: '연애 목표', limit: 2 },
  { type: 'DATING_STYLE', title: '데이트 스타일', limit: 2 },
  { type: 'DATE_PREFERENCE', title: '선호 데이트', limit: 3 },
  { type: 'PERSONALITY', title: '성격', limit: 2 },
  { type: 'APPEARANCE', title: '외모', limit: 3 },
  { type: 'TALENT', title: '재능/특기', limit: 2 },
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

  // ✅ 데이터 호출 (안전한 파싱 로직 적용)
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/preferences');

        let finalData: PreferenceItem[] = [];

        // 1. response 자체가 배열인 경우 (Interceptor가 data를 바로 반환할 때)
        if (Array.isArray(response)) {
          finalData = response;
        }
        // 2. response.data가 배열인 경우 (일반적인 구조)
        else if (Array.isArray(response.data)) {
          finalData = response.data;
        }
        // 3. response.data.data가 배열인 경우 (백엔드 공통 응답 포맷)
        else if (response.data && Array.isArray(response.data.data)) {
          finalData = response.data.data;
        }

        setServerItems(finalData);
      } catch (error) {
        console.error('데이터 호출 에러:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPreferences();
  }, []);

  // ✅ 렌더링 최적화 (데이터 그룹화)
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
      <div className="w-full max-w-2xl flex items-center mb-4 px-4">
        <button
          type="button"
          onClick={onBack}
          className="p-2 hover:bg-white/50 rounded-full transition-all"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      <div className="w-full max-w-2xl bg-white/90 backdrop-blur-3xl rounded-[40px] p-8 shadow-2xl flex flex-col h-[75vh]">
        <div className="flex-1 overflow-y-auto scrollbar-hide">
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
              const selectedCountInfo = selectedIds.filter((id) =>
                currentSectionIds.includes(id),
              ).length;
              const isSectionFull = selectedCountInfo >= section.limit;

              // 아이템이 없는 섹션은 렌더링 생략
              if (items.length === 0) return null;

              return (
                <section key={section.type} className="mb-10 last:mb-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-[#1A1F36] text-lg">{section.title}</h3>
                    <span className="text-xs font-bold text-gray-400">
                      {selectedCountInfo} / {section.limit}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => {
                      const isSelected = selectedIds.includes(item.id);
                      const isDisabled = !isSelected && isSectionFull;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleItem(item.id, section.type, section.limit)}
                          disabled={isDisabled}
                          className={`px-5 py-2.5 rounded-full text-sm font-bold border-2 transition-all duration-200 ${
                            isSelected
                              ? 'border-[#FF4D94] text-[#FF4D94] bg-pink-50 shadow-sm'
                              : isDisabled
                                ? 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed opacity-60'
                                : 'border-gray-50 text-gray-400 bg-white hover:border-gray-200 hover:text-gray-600'
                          }`}
                        >
                          {item.content}
                        </button>
                      );
                    })}
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
            className={`w-full py-8 rounded-2xl text-xl font-black transition-all ${
              selectedIds.length === 14
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
