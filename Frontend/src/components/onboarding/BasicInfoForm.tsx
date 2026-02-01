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
  nickName: string;
  gender: 'MALE' | 'FEMALE' | null;
  birth: { year: string; month: string; day: string };
  mbti: { ei: string; ns: string; ft: string; jp: string };
}

export interface BasicInfoFormProps {
  initialData: BasicInfoData;
  onNext: (data: BasicInfoData) => void;
}

export default function BasicInfoForm({ initialData, onNext }: BasicInfoFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<BasicInfoData>(initialData);

  // ✅ 부모 데이터 동기화
  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

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

  const isFormValid =
    formData.profileFile !== null &&
    formData.nickName.trim().length > 0 &&
    formData.gender !== null &&
    formData.birth.year !== '' &&
    formData.birth.month !== '' &&
    formData.birth.day !== '' &&
    Object.values(formData.mbti).every((v) => v !== '');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => (currentYear - 19 - i).toString());
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

  return (
    <div className="w-full flex flex-col items-center">
      <div className="text-center mb-10 z-10">
        <div className="w-14 h-14 bg-gradient-to-tr from-[#FF4D94] to-[#7C3AED] rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg shadow-pink-100">
          <Heart size={28} fill="white" className="text-white" />
        </div>
        <h1 className="text-3xl font-black text-[#1A1F36] mb-2">프로필 설정</h1>
        <p className="text-gray-400 font-medium text-sm">나를 표현하는 모든 항목을 입력해주세요.</p>
      </div>

      <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-3xl rounded-[60px] p-8 md:p-16 shadow-2xl border border-white z-10 overflow-visible">
        <form className="space-y-12" onSubmit={(e) => e.preventDefault()}>
          {/* 1. 사진 업로드 (복구) */}
          <div className="flex justify-center mb-4">
            <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-40 h-40 rounded-full border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center overflow-hidden hover:border-[#FF4D94] transition-colors shadow-inner">
                {formData.previewUrl ? (
                  <img
                    src={formData.previewUrl}
                    className="w-full h-full object-cover"
                    alt="Profile"
                  />
                ) : (
                  <>
                    <Camera size={32} className="text-gray-300 mb-1" />
                    <span className="text-[10px] text-gray-400 font-bold tracking-tighter text-center px-4">
                      대표 사진
                    </span>
                  </>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* 2. 닉네임 (성함 고정) */}
          <div className="space-y-4">
            <label className="text-sm font-black text-[#1A1F36] ml-1">성함(인증됨)</label>
            <input
              value={formData.nickName || '정보를 불러오는 중...'}
              readOnly
              className="w-full bg-gray-100 border border-gray-100 rounded-2xl py-5 px-7 text-gray-400 font-bold cursor-not-allowed outline-none shadow-sm"
            />
          </div>

          {/* 3. 성별 */}
          <div className="space-y-4">
            <label className="text-sm font-black text-[#1A1F36] ml-1">성별</label>
            <div className="flex bg-gray-50/80 rounded-2xl p-2 gap-2 border border-gray-100">
              <button
                type="button"
                onClick={() => updateField('gender', 'FEMALE')}
                className={`flex-1 py-4 rounded-xl font-bold transition-all ${formData.gender === 'FEMALE' ? 'bg-white text-[#FF4D94] shadow-md border-pink-100' : 'text-gray-400 hover:bg-gray-100'}`}
              >
                ♀ 여성
              </button>
              <button
                type="button"
                onClick={() => updateField('gender', 'MALE')}
                className={`flex-1 py-4 rounded-xl font-bold transition-all ${formData.gender === 'MALE' ? 'bg-white text-[#FF4D94] shadow-md border-pink-100' : 'text-gray-400 hover:bg-gray-100'}`}
              >
                ♂ 남성
              </button>
            </div>
          </div>

          {/* 4. 생년월일 (깨짐 방지 수정 완료) */}
          <div className="space-y-4">
            <label className="text-sm font-black text-[#1A1F36] ml-1">생년월일</label>
            <div className="grid grid-cols-3 gap-4">
              <Select
                value={formData.birth.year}
                onValueChange={(v) => updateField('birth', { ...formData.birth, year: v })}
              >
                <SelectTrigger className="h-14 rounded-2xl bg-white border-gray-100 font-bold shadow-sm">
                  <SelectValue placeholder="년" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="max-h-60 bg-white z-[999] shadow-2xl border-pink-100"
                >
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={formData.birth.month}
                onValueChange={(v) => updateField('birth', { ...formData.birth, month: v })}
              >
                <SelectTrigger className="h-14 rounded-2xl bg-white border-gray-100 font-bold shadow-sm">
                  <SelectValue placeholder="월" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="max-h-60 bg-white z-[999] shadow-2xl border-pink-100"
                >
                  {months.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}월
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={formData.birth.day}
                onValueChange={(v) => updateField('birth', { ...formData.birth, day: v })}
              >
                <SelectTrigger className="h-14 rounded-2xl bg-white border-gray-100 font-bold shadow-sm">
                  <SelectValue placeholder="일" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="max-h-60 bg-white z-[999] shadow-2xl border-pink-100"
                >
                  {days.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}일
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            다음 단계로
          </Button>
        </form>
      </div>
    </div>
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
