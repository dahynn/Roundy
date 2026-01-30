import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PREFERENCE_DATA = [
  {
    id: 'RELATIONSHIP_GOAL',
    title: '선호 관계',
    limit: 2,
    items: [
      '결혼 의향도 있어요',
      '진지한 연애',
      '일단 연애부터',
      '일단 친구부터',
      '아직 모르겠어요',
    ],
  },
  {
    id: 'DATING_STYLE',
    title: '연애 스타일',
    limit: 2,
    items: [
      '다정한 스킨십',
      '상대한테 맞춰줘요',
      '깜짝 선물',
      '응원과 격려',
      '함께 시간 보내기',
      '꾸준한 연락',
      '취미/관심사 공유',
      '소소한 이벤트',
      '표현을 잘해요',
      '꼼꼼한 데이트 계획',
      '한 사람만 봐요',
    ],
  },
  {
    id: 'DATE_PREFERENCE',
    title: '선호 데이트',
    limit: 3,
    items: [
      '집에서 놀기',
      '근교 드라이브하기',
      '요리해먹기',
      '맛집 투어하기',
      '쇼핑하기',
      '카페 투어하기',
      '같이 술 마시기',
      '노래방 가기',
      '놀이공원 가기',
      '동네 구경하기',
      '산책하기',
      '영화 보러가기',
      '전시회 보러가기',
      '같이 운동하기',
      '같이 게임하기',
      '공연/콘서트 관람하기',
      '스포츠 관람하기',
      '여행가기',
    ],
  },
  {
    id: 'PERSONALITY',
    title: '선호 성격',
    limit: 2,
    items: [
      '웃음이 많아요',
      '예의가 발라요',
      '긍정적인 마인드',
      '솔직해요',
      '다정해요',
      '배려심이 깊어요',
      '동물을 좋아해요',
      '털털해요',
      '장난기가 많아요',
      '애교가 많아요',
      '허세 없어요',
      '유머 감각이 있어요',
      '섬세해요',
      '수줍어요',
      '낙천적이에요',
      '활발해요',
      '감성적이에요',
      '친절해요',
      '엉뚱해요',
      '성실해요',
      '리드하는 편',
      '조용해요',
      '직진해요',
    ],
  },
  {
    id: 'APPEARANCE',
    title: '선호 외모',
    limit: 3,
    items: [
      '강아지상',
      '고양이상',
      '눈웃음',
      '동안이에요',
      '큰 눈',
      '손이 예뻐요',
      '깨끗한 피부',
      '하얀 피부',
      '구릿빛 피부',
      '비율이 좋아요',
      '보조개',
      '다리가 예뻐요',
      '쌍커풀 없는 눈',
      '오똑한 콧날',
      '힙업',
      '섹시한 타투',
      '짙은 눈썹',
      '넓은 골반',
      '실물파',
    ],
  },
  {
    id: 'TALENT',
    title: '재능 및 특기',
    limit: 2,
    items: [
      '이야기를 잘 들어줘요',
      '대화를 잘 이끌어요',
      '뭐든 잘 먹어요',
      '혼자 잘 놀아요',
      '요리를 잘해요',
      '패션 센스가 좋아요',
      '운동을 좋아해요',
      '목소리가 좋아요',
      '체력이 좋아요',
      '노래를 잘해요',
      '섹시한 두뇌',
      '시사에 밝아요',
      '게임을 잘해요',
      '높은 경제력',
      '고소득자',
      '운전 잘해요',
      '집안일 잘해요',
      '적극적인 플로팅',
    ],
  },
];

export default function OnboardingThird() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleItem = (groupId: string, item: string, limit: number) => {
    const itemKey = `${groupId}:${item}`;
    const currentGroupSelected = selectedIds.filter((id) => id.startsWith(groupId));
    if (selectedIds.includes(itemKey)) {
      setSelectedIds(selectedIds.filter((id) => id !== itemKey));
    } else if (currentGroupSelected.length < limit) {
      setSelectedIds([...selectedIds, itemKey]);
    }
  };

  const handleComplete = () => {
    if (selectedIds.length !== 14) return;
    alert('취향 수집 완료! 로테이션 소개팅에 오신걸 환영합니다.');
    navigate('/home');
  };

  return (
    <div className="min-h-full bg-[#FDF2F8] flex flex-col items-center py-10 px-6 font-['Pretendard']">
      <div className="w-full max-w-2xl flex items-center justify-between mb-8 z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-white/50 rounded-full transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-[#1A1F36]">연애 성향 및 선호 설정</h1>
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
                  <span
                    className={`text-sm font-bold ${count === group.limit ? 'text-[#FF4D94]' : 'text-gray-300'}`}
                  >
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
            disabled={selectedIds.length !== 14}
            onClick={handleComplete}
            className={`w-full py-8 rounded-[24px] text-xl font-bold ${selectedIds.length === 14 ? 'bg-gradient-to-r from-[#FF4D94] to-[#7C3AED] text-white' : 'bg-gray-100 text-gray-300'}`}
          >
            {selectedIds.length === 14 ? '완료' : `총 14개 중 ${selectedIds.length}개 선택됨`}
          </Button>
        </div>
      </div>
    </div>
  );
}
