import { useState, useRef, useEffect } from 'react';
import { Heart, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface BasicInfoData {
  profileFile: File | null;
  previewUrl: string;
  name: string; // 성함(인증됨) 추가
  email: string; // 이메일 추가
  nickName: string; // 닉네임(수정가능)
  gender: 'MALE' | 'FEMALE' | null;
  birth: { year: string; month: string; day: string };
  mbti: { ei: string; ns: string; ft: string; jp: string };
}

export interface BasicInfoFormProps {
  initialData: BasicInfoData;
  onNext: (data: BasicInfoData) => void;
  hideHeader?: boolean;
}

export default function BasicInfoForm({ initialData, onNext, hideHeader }: BasicInfoFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<BasicInfoData>(initialData);

  // ✅ 초기 데이터 설정 (최초 1회 및 서버 데이터 수신 시)
  useEffect(() => {
    if (initialData.name || initialData.email) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
        gender: initialData.gender || prev.gender || 'FEMALE',
      }));
    }
  }, [initialData.name, initialData.email, initialData.gender]);

  const updateField = <K extends keyof BasicInfoData>(field: K, value: BasicInfoData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateField('profileFile', file);
      updateField('previewUrl', URL.createObjectURL(file));
    }
  };

  const handleMbtiClick = (group: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      mbti: { ...prev.mbti, [group]: value },
    }));
  };

  // ✅ 디버깅용: 어떤 필드가 누락되었는지 콘솔에 출력
  useEffect(() => {
    const missingFields = {
      photo: !formData.profileFile && !formData.previewUrl,
      nickname: !formData.nickName.trim(),
      gender: !formData.gender,
      birthYear: !formData.birth.year,
      birthMonth: !formData.birth.month,
      birthDay: !formData.birth.day,
      mbti: !Object.values(formData.mbti).every((v) => v !== ''),
    };
    if (Object.values(missingFields).some(v => v)) {
      console.log('🚧 미입력 항목:', missingFields);
    } else {
      console.log('✅ 모든 항목 입력 완료! 버튼 활성화');
    }
  }, [formData]);

  const isFormValid =
    (formData.profileFile !== null || formData.previewUrl !== '') &&
    formData.nickName.trim().length > 0 &&
    formData.gender !== null &&
    formData.birth.year !== '' &&
    formData.birth.month !== '' &&
    formData.birth.day !== '' &&
    Object.values(formData.mbti).every((v) => v !== '');

  const currentYear = new Date().getFullYear();
  // 19살(2007년)부터 70살(1956년)까지 폭넓게 선택 가능하도록 수정
  const years = Array.from({ length: 60 }, (_, i) => (currentYear - 19 - i).toString());
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

  return (
    <div className="w-full flex flex-col items-center">
      {!hideHeader && (
        <div className="text-center mb-10 z-10">
          <div className="w-14 h-14 bg-gradient-to-tr from-[#FF4D94] to-[#7C3AED] rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg shadow-pink-100">
            <Heart size={28} fill="white" className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-[#1A1F36] mb-2">프로필 설정</h1>
          <p className="text-gray-400 font-medium text-sm">나를 표현하는 모든 항목을 입력해주세요.</p>
        </div>
      )}

      <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-3xl rounded-[60px] p-8 md:p-16 shadow-2xl border border-white z-10 overflow-visible">
        <form className="space-y-12" onSubmit={(e) => e.preventDefault()}>
          {/* 1. 프로필 이미지 및 고정 정보(성함, 이메일) 표시 */}
          <div className="flex flex-col items-center mb-4">
            <div className="relative group cursor-pointer mb-6" onClick={() => fileInputRef.current?.click()}>
              <div className="w-40 h-40 rounded-full p-1 bg-gradient-to-tr from-[#FF4D94]/20 to-[#7C3AED]/20 group-hover:from-[#FF4D94]/40 group-hover:to-[#7C3AED]/40 transition-all duration-500 shadow-xl shadow-pink-100/20">
                <div className="w-full h-full rounded-full border-2 border-dashed border-gray-100 bg-white flex flex-col items-center justify-center overflow-hidden transition-colors shadow-inner relative">
                  {formData.previewUrl ? (
                    <img
                      src={formData.previewUrl}
                      className="w-full h-full object-cover"
                      alt="Profile"
                    />
                  ) : (
                    <>
                      <Camera size={32} className="text-gray-200 mb-1 group-hover:text-[#FF4D94] transition-colors" />
                      <span className="text-[10px] text-gray-300 font-bold tracking-tighter text-center px-4">
                        사진 등록
                      </span>
                    </>
                  )}
                  {/* 오버레이 효과 */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            {/* 고정 정보 요약 */}
            <div className="text-center space-y-1 animate-in fade-in slide-in-from-top-2 duration-700">
              <h2 className="text-2xl font-black text-[#1A1F36]">
                {formData.name || '유저'}
              </h2>
              <p className="text-sm font-bold text-gray-400/70 tracking-tight">
                {formData.email}
              </p>
            </div>
          </div>

          {/* 2. 입력 섹션 */}
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-sm font-black text-[#1A1F36] ml-1">닉네임</label>
              <input
                value={formData.nickName}
                onChange={(e) => updateField('nickName', e.target.value)}
                placeholder="사용하실 닉네임을 입력해주세요"
                className="w-full bg-white border border-gray-100 rounded-2xl py-5 px-7 text-[#1A1F36] font-bold outline-none shadow-sm focus:border-[#FF4D94] focus:ring-4 focus:ring-pink-50 transition-all"
              />
            </div>
          </div>

          {/* 3. 성별 (프리미엄 세그먼트) */}
          <div className="space-y-4">
            <label className="text-sm font-black text-[#1A1F36] ml-1">성별</label>
            <div className="flex bg-gray-100/50 rounded-[28px] p-2 gap-2 border border-gray-100/50 shadow-inner">
              <button
                type="button"
                onClick={() => updateField('gender', 'FEMALE')}
                className={`flex-1 py-5 rounded-[22px] font-bold transition-all duration-300 ${formData.gender === 'FEMALE'
                  ? 'bg-white text-[#FF4D94] shadow-[0_10px_20px_rgba(255,77,148,0.15)] scale-[1.02] border border-pink-100'
                  : 'text-gray-400 hover:bg-gray-200/50'
                  }`}
              >
                <span className="mr-1">♀</span> 여성
              </button>
              <button
                type="button"
                onClick={() => updateField('gender', 'MALE')}
                className={`flex-1 py-5 rounded-[22px] font-bold transition-all duration-300 ${formData.gender === 'MALE'
                  ? 'bg-white text-[#FF4D94] shadow-[0_10px_20px_rgba(124,58,237,0.1)] scale-[1.02] border border-violet-100'
                  : 'text-gray-400 hover:bg-gray-200/50'
                  }`}
              >
                <span className="mr-1">♂</span> 남성
              </button>
            </div>
          </div>

          {/* 4. 생년월일 (일체형 프리미엄 디자인) */}
          <div className="space-y-4">
            <label className="text-sm font-black text-[#1A1F36] ml-1">생년월일</label>
            <div className="relative group transition-all duration-300">
              <div className="flex items-center bg-white border-2 border-gray-100 rounded-[32px] overflow-hidden shadow-sm group-focus-within:border-[#FF4D94]/30 group-focus-within:ring-8 group-focus-within:ring-pink-50/50 transition-all duration-500">
                {/* 달력 아이콘 */}
                <div className="pl-6 pr-2 text-gray-300 group-focus-within:text-[#FF4D94] transition-colors">
                  <Heart size={20} fill="currentColor" className="opacity-20" />
                </div>

                <Select
                  value={formData.birth.year}
                  onValueChange={(v) => updateField('birth', { ...formData.birth, year: v })}
                >
                  <SelectTrigger className="h-20 border-none bg-transparent font-bold text-lg focus:ring-0 rounded-none flex-1 shadow-none pr-4">
                    <SelectValue placeholder={<span>년</span>} />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-[999] shadow-2xl border-pink-50 rounded-3xl">
                    {years.map((y) => (
                      <SelectItem key={y} value={y} className="py-3 focus:bg-pink-50 focus:text-[#FF4D94]">
                        <span>{y}년</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="w-[1px] h-8 bg-gray-100/80" />

                <Select
                  value={formData.birth.month}
                  onValueChange={(v) => updateField('birth', { ...formData.birth, month: v })}
                >
                  <SelectTrigger className="h-20 border-none bg-transparent font-bold text-lg focus:ring-0 rounded-none flex-1 shadow-none px-4">
                    <SelectValue placeholder={<span>월</span>} />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-[999] shadow-2xl border-pink-50 rounded-3xl">
                    {months.map((m) => (
                      <SelectItem key={m} value={m} className="py-3 focus:bg-pink-50 focus:text-[#FF4D94]">
                        <span>{m}월</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="w-[1px] h-8 bg-gray-100/80" />

                <Select
                  value={formData.birth.day}
                  onValueChange={(v) => updateField('birth', { ...formData.birth, day: v })}
                >
                  <SelectTrigger className="h-20 border-none bg-transparent font-bold text-lg focus:ring-0 rounded-none flex-1 shadow-none px-4">
                    <SelectValue placeholder={<span>일</span>} />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-[999] shadow-2xl border-pink-50 rounded-3xl">
                    {days.map((d) => (
                      <SelectItem key={d} value={d} className="py-3 focus:bg-pink-50 focus:text-[#FF4D94]">
                        <span>{d}일</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 5. MBTI (복구) */}
          <div className="space-y-5">
            <label className="text-sm font-black text-[#1A1F36] ml-1 uppercase">MBTI</label>
            <div className="grid grid-cols-4 gap-4">
              {['ei', 'ns', 'ft', 'jp'].map((g) => (
                <div key={g} className="flex flex-col gap-4">
                  <MbtiBtn
                    active={
                      formData.mbti[g as keyof typeof formData.mbti] ===
                      (g === 'ei' ? 'E' : g === 'ns' ? 'N' : g === 'ft' ? 'F' : 'J')
                    }
                    onClick={() =>
                      handleMbtiClick(
                        g,
                        g === 'ei' ? 'E' : g === 'ns' ? 'N' : g === 'ft' ? 'F' : 'J',
                      )
                    }
                    label={g === 'ei' ? 'E' : g === 'ns' ? 'N' : g === 'ft' ? 'F' : 'J'}
                  />
                  <MbtiBtn
                    active={
                      formData.mbti[g as keyof typeof formData.mbti] ===
                      (g === 'ei' ? 'I' : g === 'ns' ? 'S' : g === 'ft' ? 'T' : 'P')
                    }
                    onClick={() =>
                      handleMbtiClick(
                        g,
                        g === 'ei' ? 'I' : g === 'ns' ? 'S' : g === 'ft' ? 'T' : 'P',
                      )
                    }
                    label={g === 'ei' ? 'I' : g === 'ns' ? 'S' : g === 'ft' ? 'T' : 'P'}
                  />
                </div>
              ))}
            </div>
          </div>

          <Button
            disabled={!isFormValid}
            onClick={() => onNext(formData)}
            className={`w-full py-10 rounded-[30px] text-xl font-bold shadow-xl mt-14 transition-all ${isFormValid ? 'bg-gradient-to-r from-[#FF4D94] via-[#FF7EB3] to-[#7C3AED] text-white shadow-pink-200' : 'bg-gray-100 text-gray-300'}`}
          >
            완료
          </Button>
        </form>
      </div >
    </div >
  );
}

function MbtiBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-16 rounded-2xl font-bold text-lg transition-all border-2 ${active ? 'border-[#FF4D94] bg-pink-50 text-[#FF4D94] shadow-sm' : 'border-gray-50 bg-white text-gray-300 hover:border-gray-200'}`}
    >
      {label}
    </button>
  );
}
