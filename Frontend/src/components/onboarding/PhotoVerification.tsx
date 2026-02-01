import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, ChevronLeft, RefreshCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoVerificationProps {
  initialFile: File | null;
  initialPreview: string;
  onNext: (file: File, preview: string) => void;
  onBack: () => void;
}

export default function PhotoVerification({
  initialFile,
  initialPreview,
  onNext,
  onBack,
}: PhotoVerificationProps) {
  const [verifyFile, setVerifyFile] = useState<File | null>(initialFile);
  const [previewUrl, setPreviewUrl] = useState<string>(initialPreview);
  const [showWebcam, setShowWebcam] = useState<boolean>(!initialPreview);
  const webcamRef = useRef<Webcam>(null);

  // 사진 캡처 핸들러
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setPreviewUrl(imageSrc);
      fetch(imageSrc)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], 'verification_photo.jpg', { type: 'image/jpeg' });
          setVerifyFile(file);
          setShowWebcam(false);
        });
    }
  }, [webcamRef]);

  // 다시 촬영 핸들러
  const handleRetry = () => {
    setVerifyFile(null);
    setPreviewUrl('');
    setShowWebcam(true);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* 상단 헤더 */}
      <div className="w-full max-w-xl flex items-center justify-between mb-8 z-10 px-4">
        <button onClick={onBack} className="p-2 hover:bg-white/50 rounded-full transition-all">
          <ChevronLeft size={24} />
        </button>
        <div className="w-10" />
      </div>

      <div className="relative w-full max-w-xl bg-white/90 backdrop-blur-3xl rounded-[60px] p-12 md:p-16 shadow-2xl border border-white z-10 flex flex-col items-center">
        {/* 단계 표시 */}
        <div className="self-start flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-[#FF4D94] rounded-full flex items-center justify-center text-white font-black text-lg shadow-md shadow-pink-100">
            2
          </div>
          <h3 className="text-2xl font-black text-[#1A1F36]">인증 사진 촬영</h3>
        </div>

        {/* 메인 화면 (웹캠 또는 미리보기) */}
        <div className="w-full aspect-[4/4.5] rounded-[40px] border-2 border-dashed relative overflow-hidden mb-8 transition-all flex flex-col items-center justify-center border-[#FF4D94] bg-black shadow-inner">
          {showWebcam ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
                videoConstraints={{ facingMode: 'user' }}
              />
              {/* 가이드 라인 */}
              <div className="absolute inset-0 border-[30px] border-black/40 pointer-events-none">
                <div className="w-full h-full border-2 border-[#FF4D94] rounded-[30px] flex items-center justify-center relative">
                  <div className="w-56 h-72 border-2 border-white/50 rounded-full shadow-[0_0_20px_rgba(255,77,148,0.3)]" />
                </div>
              </div>
              {/* 촬영 버튼 */}
              <button
                onClick={capture}
                className="absolute bottom-8 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
              >
                <div className="w-16 h-16 border-4 border-[#FF4D94] rounded-full flex items-center justify-center">
                  <div className="w-12 h-12 bg-[#FF4D94] rounded-full" />
                </div>
              </button>
            </div>
          ) : (
            <div className="relative w-full h-full group">
              <img src={previewUrl} className="w-full h-full object-cover" alt="Captured" />
              <div className="absolute top-6 right-6 bg-[#FF4D94] text-white p-2 rounded-full shadow-lg">
                <Check size={24} strokeWidth={3} />
              </div>
            </div>
          )}
        </div>

        {/* 설명 및 다시 촬영 버튼 */}
        <div className="text-center mb-10">
          {!showWebcam ? (
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 text-[#FF4D94] font-bold hover:opacity-80 transition-all mx-auto"
            >
              <RefreshCcw size={20} /> 사진 다시 촬영하기
            </button>
          ) : (
            <p className="text-[#697386] font-medium">
              얼굴 정면이 가이드라인 안에 오도록
              <br />
              맞춘 뒤 촬영 버튼을 눌러주세요.
            </p>
          )}
        </div>

        <Button
          disabled={!verifyFile || showWebcam}
          onClick={() => verifyFile && onNext(verifyFile, previewUrl)}
          className={`w-full py-9 rounded-[30px] text-xl font-bold shadow-xl transition-all ${verifyFile && !showWebcam ? 'bg-gradient-to-r from-[#FF4D94] via-[#FF7EB3] to-[#7C3AED] text-white' : 'bg-gray-100 text-gray-300'}`}
        >
          다음 단계로
        </Button>
      </div>
    </div>
  );
}
