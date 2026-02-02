import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header.tsx';
import PreferenceForm from '@/components/onboarding/PreferenceForm.tsx';
import { getPreferences, getMyPreferences, updateMyPreferences } from '@/api/preference.ts';

interface PreferenceItem {
    id: number;
    type: string;
    content: string;
}

export default function PreferenceEditPage() {
    const navigate = useNavigate();
    const [initialIds, setInitialIds] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setIsLoading(true);
                // 1. 모든 취향 항목 조회
                const allPrefs: any = await getPreferences();
                const items: PreferenceItem[] = allPrefs || [];

                // 2. 내 현재 취향 조회
                const myPrefs: any = await getMyPreferences();
                if (myPrefs && myPrefs.preferences) {
                    const mySelectedIds: number[] = [];

                    // 문자열(content)로 되어 있는 내 취향을 ID로 매칭
                    Object.entries(myPrefs.preferences).forEach(([type, contents]: [string, any]) => {
                        contents.forEach((content: string) => {
                            const matched = items.find(item => item.type === type && item.content === content);
                            if (matched) {
                                mySelectedIds.push(matched.id);
                            }
                        });
                    });

                    setInitialIds(mySelectedIds);
                }
            } catch (error) {
                console.error('데이터 로딩 실패:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const handleUpdate = async (selectedIds: string[]) => {
        try {
            const numericIds = selectedIds.map(id => parseInt(id, 10));
            await updateMyPreferences({ preferenceIds: numericIds });
            alert('취향 분석 정보가 성공적으로 수정되었습니다! ✨');
            navigate('/mypage');
        } catch (error) {
            console.error('수정 실패:', error);
            alert('수정 중 오류가 발생했습니다. 다시 시도해 주세요.');
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#FDF2F8] font-['Pretendard']">
            <Header />

            <main className="flex-1 flex flex-col items-center py-10 md:py-20 overflow-y-auto no-scrollbar">
                <div className="w-full max-w-4xl px-4 flex flex-col items-center">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white/90 backdrop-blur-3xl rounded-[40px] w-full max-w-2xl shadow-xl">
                            <Loader2 className="animate-spin text-[#FF4D94]" size={48} />
                            <p className="text-gray-400 font-bold">내 정보를 불러오는 중...</p>
                        </div>
                    ) : (
                        <PreferenceForm
                            onBack={() => navigate('/mypage')}
                            onSubmit={handleUpdate}
                            initialSelectedIds={initialIds}
                            submitLabel="취향 정보 수정 완료"
                            showStepHeader={false}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}
