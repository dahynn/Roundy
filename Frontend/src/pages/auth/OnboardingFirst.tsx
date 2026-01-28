import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ChevronRight, User, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function OnboardingFirst() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 상태 관리
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [name, setName] = useState('');
  const [nickName, setNickName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | null>(null);
  const [birth, setBirth] = useState({ year: '', month: '', day: '' });
  const [mbti, setMbti] = useState<{ [key: string]: string }>({ ei: '', ns: '', ft: '', jp: '' });

  // 2. 사진 업로드 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // 3. MBTI 선택 핸들러
  const handleMbtiClick = (group: string, value: string) => {
    setMbti((prev) => ({ ...prev, [group]: value }));
  };

  // 4. 회원가입 API 호출 준비 (명세서 3번 기준)
  const handleNext = async () => {
    const mbtiString = Object.values(mbti).join('');
    const birthDate = `${birth.year}-${birth.month.padStart(2, '0')}-${birth.day.padStart(2, '0')}`;

    // API 전송용 데이터 구조
    const signupData = {
      nickName,
      gender,
      birthDate,
      mbti: mbtiString,
    };

    console.log('전송될 JSON 데이터:', signupData);
    console.log('전송될 이미지 파일:', profileFile);

    // TODO: axios 또는 fetch를 사용하여 FormData 전송
    // const formData = new FormData();
    // formData.append('data', new Blob([JSON.stringify(signupData)], { type: 'application/json' }));
    // if (profileFile) formData.append('file', profileFile);

    navigate('/onboarding/second');
  };

  const years = Array.from({ length: 40 }, (_, i) =>
    (new Date().getFullYear() - 18 - i).toString(),
  );
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

  return (
    <div className="min-h-screen bg-[#FDF2F8] flex flex-col items-center py-20 relative overflow-x-hidden font-['Pretendard']">
      <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-pink-200/20 rounded-full blur-[120px] pointer-events-none" />

      {/* 헤더 */}
      <div className="text-center mb-10 z-10">
        <div className="w-14 h-14 bg-gradient-to-tr from-[#FF4D94] to-[#7C3AED] rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg shadow-pink-100">
          <Heart size={28} fill="white" className="text-white" />
        </div>
        <h1 className="text-3xl font-black text-[#1A1F36] mb-2">프로필 설정</h1>
        <p className="text-gray-400 font-medium">나를 가장 잘 표현하는 정보를 입력해주세요.</p>
      </div>

      <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-3xl rounded-[60px] p-12 md:p-16 shadow-2xl border border-white z-10">
        <form className="space-y-12" onSubmit={(e) => e.preventDefault()}>
          {/* 대표 사진 등록 */}
          <div className="flex justify-center">
            <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-40 h-40 rounded-full border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center overflow-hidden">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    className="w-full h-full object-cover"
                    alt="Profile Preview"
                  />
                ) : (
                  <>
                    <Camera size={32} className="text-gray-300 mb-1" />
                    <span className="text-[10px] text-gray-400 font-bold tracking-tighter">
                      대표 사진 1개 등록
                    </span>
                  </>
                )}
              </div>
              <div className="absolute bottom-1 right-1 w-11 h-11 bg-gradient-to-tr from-[#FF4D94] to-[#7C3AED] rounded-full border-4 border-white flex items-center justify-center shadow-md">
                <Camera size={18} className="text-white" />
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

          {/* 입력 필드들 (레이아웃 간격 조정) */}
          <div className="space-y-10">
            <div className="space-y-4">
              <label className="text-sm font-black text-[#1A1F36] ml-1">내 이름</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                placeholder="김라운디"
                className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl py-5 px-7 focus:outline-none focus:border-[#FF4D94] transition-all"
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-black text-[#1A1F36] ml-1">닉네임</label>
              <input
                value={nickName}
                onChange={(e) => setNickName(e.target.value)}
                type="text"
                placeholder="사용하실 닉네임을 입력해주세요"
                className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl py-5 px-7 focus:outline-none focus:border-[#FF4D94] transition-all"
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-black text-[#1A1F36] ml-1">성별</label>
              <div className="flex bg-gray-50/80 rounded-2xl p-2 gap-2 border border-gray-100">
                <button
                  type="button"
                  onClick={() => setGender('FEMALE')}
                  className={`flex-1 py-4 rounded-xl font-bold transition-all ${gender === 'FEMALE' ? 'bg-white text-[#FF4D94] shadow-md' : 'text-gray-400'}`}
                >
                  ♀ 여성
                </button>
                <button
                  type="button"
                  onClick={() => setGender('MALE')}
                  className={`flex-1 py-4 rounded-xl font-bold transition-all ${gender === 'MALE' ? 'bg-white text-[#FF4D94] shadow-md' : 'text-gray-400'}`}
                >
                  ♂ 남성
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-black text-[#1A1F36] ml-1">생년월일</label>
              <div className="grid grid-cols-3 gap-4">
                <Select onValueChange={(v) => setBirth((prev) => ({ ...prev, year: v }))}>
                  <SelectTrigger className="h-14 rounded-2xl bg-white border-gray-100 focus:ring-[#FF4D94]">
                    <SelectValue placeholder="년" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 bg-white z-[110]">
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}년
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={(v) => setBirth((prev) => ({ ...prev, month: v }))}>
                  <SelectTrigger className="h-14 rounded-2xl bg-white border-gray-100 focus:ring-[#FF4D94]">
                    <SelectValue placeholder="월" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-[110]">
                    {months.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}월
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={(v) => setBirth((prev) => ({ ...prev, day: v }))}>
                  <SelectTrigger className="h-14 rounded-2xl bg-white border-gray-100 focus:ring-[#FF4D94]">
                    <SelectValue placeholder="일" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 bg-white z-[110]">
                    {days.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}일
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-5">
              <label className="text-sm font-black text-[#1A1F36] ml-1 uppercase">MBTI</label>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { g: 'ei', v1: 'E', v2: 'I' },
                  { g: 'ns', v1: 'N', v2: 'S' },
                  { g: 'ft', v1: 'F', v2: 'T' },
                  { g: 'jp', v1: 'J', v2: 'P' },
                ].map((group) => (
                  <div key={group.g} className="flex flex-col gap-4">
                    <MbtiBtn
                      active={mbti[group.g] === group.v1}
                      onClick={() => handleMbtiClick(group.g, group.v1)}
                      label={group.v1}
                    />
                    <MbtiBtn
                      active={mbti[group.g] === group.v2}
                      onClick={() => handleMbtiClick(group.g, group.v2)}
                      label={group.v2}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Button
            className="w-full py-10 bg-gradient-to-r from-[#FF4D94] via-[#FF7EB3] to-[#7C3AED] hover:opacity-90 text-white rounded-[30px] text-xl font-bold shadow-xl shadow-pink-200/50 mt-14"
            onClick={handleNext}
          >
            다음
          </Button>
        </form>
      </div>
      <p className="mt-8 text-[11px] text-gray-300 font-bold uppercase tracking-widest">
        © 2026 ROUNDY. PREMIUM MEMBERSHIP REGISTRATION.
      </p>
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
      className={`h-16 rounded-2xl font-bold text-lg transition-all border-2 ${
        active
          ? 'border-[#FF4D94] bg-pink-50 text-[#FF4D94]'
          : 'border-gray-50 bg-white text-gray-300 hover:border-gray-100'
      }`}
    >
      {label}
    </button>
  );
}
