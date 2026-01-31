import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';

const PREFERENCE_DATA = [
    { id: 'RELATIONSHIP', title: '선호 관계', limit: 2, items: ['결혼 의향', '진지한 연애', '가벼운 연애', '친구부터'] },
    { id: 'STYLE', title: '연애 스타일', limit: 2, items: ['다정한', '리드하는', '연락 자주', '각자 시간 존중'] },
    { id: 'DATE', title: '선호 데이트', limit: 3, items: ['집데이트', '맛집탐방', '드라이브', '전시회', 'PC방', '술한잔', '산책'] },
    { id: 'PERSONALITY', title: '선호 성격', limit: 2, items: ['유머러스', '차분한', '활발한', '섬세한', '지적인'] },
    { id: 'APPEARANCE', title: '선호 외모', limit: 3, items: ['강아지상', '고양이상', '무쌍', '큰 키', '패션피플'] },
    { id: 'TALENT', title: '매력 포인트', limit: 2, items: ['요리왕', '노래', '운동', '외국어', '유머'] },
];

interface PreferenceFormProps {
    onBack: () => void;
    onSubmit: (selectedIds: string[]) => void;
}

export default function PreferenceForm({ onBack, onSubmit }: PreferenceFormProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const TOTAL_GOAL = 14;

    const toggleItem = (groupId: string, item: string, limit: number) => {
        const itemKey = `${groupId}:${item}`;
        const groupCount = selectedIds.filter((id) => id.startsWith(groupId)).length;

        if (selectedIds.includes(itemKey)) {
            setSelectedIds(selectedIds.filter((id) => id !== itemKey));
        } else if (groupCount < limit) {
            setSelectedIds([...selectedIds, itemKey]);
        }
    };

    return (
        <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-2xl flex items-center justify-between mb-8 z-10 px-4">
                <button onClick={onBack} className="p-2 hover:bg-white/50 rounded-full transition-all">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-xl font-black text-[#1A1F36]">취향 선택</h1>
                <div className="w-10" />
            </div>

            <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-3xl rounded-[40px] shadow-2xl border border-white z-10 overflow-hidden flex flex-col h-[75vh]">
                <div className="flex-1 overflow-y-auto p-8 md:p-12">
                    {PREFERENCE_DATA.map((group) => {
                        const count = selectedIds.filter((id) => id.startsWith(group.id)).length;
                        return (
                            <section key={group.id} className="mb-12 last:mb-0">
                                <div className="flex items-center gap-2 mb-6">
                                    <h3 className="text-lg font-black">{group.title}</h3>
                                    <span className={`text-sm font-bold ${count === group.limit ? 'text-[#FF4D94]' : 'text-gray-300'}`}>
                    {count}/{group.limit}
                  </span>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {group.items.map((item) => (
                                        <button
                                            key={item}
                                            onClick={() => toggleItem(group.id, item, group.limit)}
                                            className={`px-5 py-3 rounded-full text-sm font-bold border-2 transition-all ${selectedIds.includes(`${group.id}:${item}`) ? 'border-[#FF4D94] bg-pink-50 text-[#FF4D94]' : 'border-gray-50 bg-white text-gray-400'}`}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
                <div className="p-8 bg-white border-t border-gray-50">
                    <Button
                        disabled={selectedIds.length !== TOTAL_GOAL}
                        onClick={() => onSubmit(selectedIds)}
                        className={`w-full py-8 rounded-[24px] text-xl font-bold ${selectedIds.length === TOTAL_GOAL ? 'bg-gradient-to-r from-[#FF4D94] to-[#7C3AED] text-white' : 'bg-gray-100 text-gray-300'}`}
                    >
                        {selectedIds.length === TOTAL_GOAL ? '가입 완료' : `${selectedIds.length} / ${TOTAL_GOAL} 선택됨`}
                    </Button>
                </div>
            </div>
        </div>
    );
}