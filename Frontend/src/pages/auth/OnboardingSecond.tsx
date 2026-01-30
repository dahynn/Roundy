import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OnboardingSecond() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 상태 관리
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // 2. 이미지 조작 상태 (드래그 및 확대/축소)
  const [imgPos, setImgPos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1.2);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  // 3. 사진 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVerifyFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      // 사진 변경 시 조작 값 초기화
      setImgPos({ x: 0, y: 0 });
      setScale(1.2);
    }
  };

  // 4. 마우스 휠 확대/축소 로직
  const handleWheel = (e: React.WheelEvent) => {
    if (!previewUrl) return;
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(1, scale + delta), 3);
    setScale(newScale);
  };

  // 5. 등록 완료 버튼 클릭 시 (백엔드 명세 4번 연동 지점)
  const handleUpload = async () => {
    if (!verifyFile) return;

    // TODO: 명세서 4번에 따라 /api/auth/verify API 호출 로직 추가 예정
    console.log('검증용 사진 등록 완료:', verifyFile);

    // 다음 단계(취향 선택 페이지)로 이동
    navigate('/onboarding/third');
  };

  return (
    <div
      className="min-h-screen bg-[#FDF2F8] flex flex-col items-center py-20 relative overflow-hidden font-['Pretendard']"
      onMouseUp={() => setIsDragging(false)}
      onMouseMove={(e) => {
        if (!isDragging) return;
        setImgPos({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
      }}
    >
      {/* 배경 디자인 유닛 */}
      <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-pink-200/20 rounded-full blur-[120px] pointer-events-none" />

      {/* 헤더 섹션 */}
      <div className="text-center mb-10 z-10 px-4">
        <div className="w-14 h-14 bg-gradient-to-tr from-[#FF4D94] to-[#7C3AED] rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg shadow-pink-100">
          <Heart size={28} fill="white" className="text-white" />
        </div>
        <h1 className="text-3xl font-black text-[#1A1F36] mb-2 tracking-tight">프로필 설정</h1>
        <p className="text-gray-400 font-medium text-sm">
          나를 가장 잘 표현하는 정보를 입력해주세요.
        </p>
      </div>

      {/* 메인 카드 컨테이너 */}
      <div className="relative w-full max-w-xl bg-white/90 backdrop-blur-3xl rounded-[60px] p-12 md:p-16 shadow-2xl border border-white z-10 flex flex-col items-center">
        {/* 단계 표시 가이드 */}
        <div className="self-start flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-[#FF4D94] rounded-full flex items-center justify-center text-white font-black text-lg shadow-md shadow-pink-100">
            1
          </div>
          <h3 className="text-2xl font-black text-[#1A1F36]">대표 사진 등록</h3>
        </div>

        {/* 사진 업로드 및 조작 영역 (image_42e9e0.png 시안 반영) */}
        <div
          className={`w-full aspect-[4/4.5] rounded-[40px] border-2 border-dashed relative overflow-hidden mb-6 transition-all flex flex-col items-center justify-center ${
            previewUrl ? 'border-[#FF4D94] cursor-move bg-black' : 'border-pink-200 bg-pink-50/30'
          }`}
          onMouseDown={(e) => {
            if (!previewUrl) return;
            setIsDragging(true);
            setStartPos({ x: e.clientX - imgPos.x, y: e.clientY - imgPos.y });
          }}
          onWheel={handleWheel}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              style={{ transform: `translate(${imgPos.x}px, ${imgPos.y}px) scale(${scale})` }}
              className="w-full h-full object-cover pointer-events-none"
              alt="Verification Preview"
            />
          ) : (
            <div className="flex flex-col items-center px-6">
              {/* 시안의 핑크색 카메라 아이콘 배경 */}
              <div className="w-20 h-20 bg-pink-100/50 rounded-full flex items-center justify-center mb-6">
                <Camera className="text-[#FF4D94]" size={40} />
              </div>

              <h4 className="text-2xl font-black text-[#1A1F36] mb-3">사진 업로드</h4>
              <p className="text-[#697386] font-medium text-center mb-8 leading-relaxed">
                얼굴 정면이 최대한 선명하게 나온 사진을 선택해주세요.
                <br />이 사진은 인증용으로만 사용될 뿐,
                <br />
                다른 유저들에게 공개되지 않아요.
              </p>

              {/* 박스 내부의 파일 선택 버튼 */}
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="px-10 py-7 bg-[#FF4D94] hover:bg-[#FF337A] text-white rounded-full text-lg font-bold shadow-lg shadow-pink-200 transition-all active:scale-95"
              >
                파일 선택하기
              </Button>
            </div>
          )}
        </div>

        {/* 하단 안내 가이드 */}
        <div className="text-center mb-10 space-y-2">
          {previewUrl && (
            <p className="text-sm font-bold text-[#FF4D94] mb-2 animate-pulse">
              드래그로 위치 이동, 휠로 확대/축소 가능합니다.
            </p>
          )}
          <p className="text-sm font-bold text-gray-400 tracking-tight">
            최대 10MB, JPG/PNG 형식만 가능합니다.
          </p>
        </div>

        {/* 숨겨진 실제 input 태그 */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />

        {/* 최종 등록 버튼: 사진이 있어야 활성화 */}
        <Button
          disabled={!verifyFile}
          onClick={handleUpload}
          className={`w-full py-9 rounded-[30px] text-xl font-bold shadow-xl transition-all ${
            verifyFile
              ? 'bg-gradient-to-r from-[#FF4D94] via-[#FF7EB3] to-[#7C3AED] text-white shadow-pink-200/50 hover:scale-[1.02]'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        >
          등록 완료
        </Button>
      </div>

      {/* 푸터 카피라이트 */}
      <p className="mt-8 text-[11px] text-gray-300 font-bold uppercase tracking-widest">
        © 2026 ROUNDY. PREMIUM MEMBERSHIP REGISTRATION.
      </p>
    </div>
  );
}
