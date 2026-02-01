import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcw, ImagePlus } from 'lucide-react';

import faceMatchImg from '@/assets/face-verification.png';

export default function VerificationPage() {
  const navigate = useNavigate();

  const [repFile, setRepFile] = useState<File | null>(null);
  const [liveBlob, setLiveBlob] = useState<Blob | null>(null);
  const [previewRep, setPreviewRep] = useState<string>('');
  const [previewLive, setPreviewLive] = useState<string>('');

  const [imgPos, setImgPos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1.2);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRepFile(file);
      setPreviewRep(URL.createObjectURL(file));
      setImgPos({ x: 0, y: 0 });
      setScale(1.2);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!previewRep) return;
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(1, scale + delta), 3);
    setScale(newScale);
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setPreviewLive(imageSrc);
      fetch(imageSrc)
          .then((res) => res.blob())
          .then((blob) => {
            setLiveBlob(blob);
            setShowWebcam(false);
          });
    }
  }, [webcamRef]);

  const handleVerify = async () => {
    if (!repFile || !liveBlob) return;
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsSuccess(true);
      alert('인증 성공! 대기방으로 이동합니다.');
      navigate('/loading');
    }, 1500);
  };

  return (
      <div
          className="flex flex-col items-center min-h-screen w-full px-4 py-12 font-['Pretendard'] overflow-x-hidden"
          style={{
            backgroundColor: '#F8F9FD',
            backgroundImage: `
              radial-gradient(circle at 0% 0%, rgba(255, 77, 148, 0.15), transparent 50%),
              radial-gradient(circle at 100% 100%, rgba(124, 58, 237, 0.15), transparent 50%)
            `
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseMove={(e) => {
            if (!isDragging) return;
            setImgPos({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
          }}
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-[#1A1F36] pb-4 tracking-tight">
            AI 페이스매칭
          </h1>
          <div className="text-[#697386] text-base space-y-1">
            <p>업로드한 사진과 실시간 촬영 화면을 AI가 대조하여 동일인 여부를 확인합니다.</p>
            <p className="font-bold text-[#FF4D94]">
              AI 본인인증을 통과해야 소개팅 대기방에 입장하실 수 있습니다.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center w-full max-w-5xl">
          <div className="flex flex-col md:flex-row gap-6 w-full justify-center mb-10 items-stretch h-[600px]">

            {/* --- 왼쪽 카드 --- */}
            <Card className="flex-1 max-w-[400px] h-full bg-white/90 backdrop-blur-md border-none shadow-xl rounded-[28px] overflow-hidden">
              <CardContent className="px-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4 shrink-0">
                <span className="flex items-center justify-center w-8 h-8 bg-[#FF4D94] text-white rounded-full font-bold text-sm">
                  1
                </span>
                  <h3 className="text-lg font-bold text-[#1A1F36]">대표 사진 등록</h3>
                </div>

                <div
                    className={`w-full h-[340px] shrink-0 rounded-[24px] border-2 border-dashed relative overflow-hidden mb-6 transition-all ${
                        previewRep ? 'cursor-move border-[#FF4D94]' : 'border-[#E0E2E7] bg-gray-50'
                    }`}
                    onMouseDown={(e) => {
                      if (!previewRep) return;
                      setIsDragging(true);
                      setStartPos({ x: e.clientX - imgPos.x, y: e.clientY - imgPos.y });
                    }}
                    onWheel={handleWheel}
                >
                  {previewRep ? (
                      <img
                          src={previewRep}
                          style={{ transform: `translate(${imgPos.x}px, ${imgPos.y}px) scale(${scale})` }}
                          className="w-full h-full object-cover pointer-events-none"
                          alt="대표"
                      />
                  ) : (
                      <div
                          className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                      >
                        <ImagePlus className="text-[#A3ACBA] mb-3" size={32} />
                        <span className="text-base font-semibold text-[#697386]">사진 업로드</span>
                      </div>
                  )}
                </div>

                <div className="shrink-0 w-full flex flex-col items-center mt-auto">
                  <p className="mb-8 text-[14px] text-[#8792A2] font-medium text-center">
                    최대 5MB, JPG/PNG/WEBP 형식만 가능합니다.
                  </p>
                  <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept="image/*"
                  />
                  <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-14 bg-[#FF4D94] text-white rounded-[1.2rem] text-lg font-bold shadow-md hover:shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {previewRep ? '사진 변경하기' : '사진 선택하기'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* --- 오른쪽 카드 --- */}
            <Card className="flex-1 max-w-[400px] h-full bg-white/90 backdrop-blur-md border-none shadow-xl rounded-[28px] overflow-hidden">
              <CardContent className="px-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4 shrink-0">
                <span className="flex items-center justify-center w-8 h-8 bg-[#FF4D94] text-white rounded-full font-bold text-sm">
                  2
                </span>
                  <h3 className="text-lg font-bold text-[#1A1F36]">실시간 본인 사진</h3>
                </div>

                <div className="w-full h-[340px] shrink-0 bg-[#0a0a0a] rounded-[24px] relative overflow-hidden mb-6 flex items-center justify-center border border-[#333] shadow-inner group">
                  {previewLive ? (
                      <img src={previewLive} className="w-full h-full object-cover" alt="실시간" />
                  ) : showWebcam ? (
                      <div className="relative w-full h-full">
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            className="w-full h-full object-cover scale-x-[-1]"
                        />
                        <div className="absolute top-0 left-[-10%] w-[120%] h-[2px] bg-[#FF4D94] shadow-[0_0_15px_#FF4D94] animate-scan-slow z-20 opacity-70 pointer-events-none" />
                      </div>
                  ) : (
                      <div className="relative flex flex-col items-center justify-center w-full h-full bg-black overflow-hidden">

                        <div className="relative w-[260px] h-[260px] rounded-full overflow-hidden flex items-center justify-center border border-[#FF4D94]/10 bg-[#FF4D94]/5 z-0">

                          <img
                              src={faceMatchImg}
                              alt="Face Wireframe"
                              className="w-[85%] h-[85%] object-contain opacity-60 animate-float-breathing"
                              style={{ mixBlendMode: 'screen' }}
                          />

                        </div>

                        <div className="absolute top-0 left-[-10%] w-[120%] h-[2px] bg-[#FF4D94] shadow-[0_0_20px_#FF4D94] animate-scan-slow z-20 opacity-80" />

                        <div className="absolute inset-0 pointer-events-none p-6 z-10">
                          <div className="w-full h-full border-2 border-[#FF4D94]/20 relative">
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#FF4D94]" />
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#FF4D94]" />
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#FF4D94]" />
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#FF4D94]" />
                          </div>
                        </div>

                        <div className="absolute bottom-12 text-[#FF4D94] text-xs font-bold tracking-[0.3em] opacity-80 z-30">
                          SYSTEM READY
                        </div>
                      </div>
                  )}
                </div>

                <div className="shrink-0 w-full flex flex-col items-center mt-auto">
                  <p className="mb-8 text-[14px] text-[#8792A2] font-medium text-center">
                    웹캠으로 현재 모습을 촬영해주세요
                  </p>
                  {!showWebcam && !previewLive ? (
                      <Button
                          onClick={() => setShowWebcam(true)}
                          className="w-full h-14 bg-[#FF4D94] text-white rounded-[1.2rem] text-lg font-bold shadow-md hover:shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
                      >
                        카메라 켜기
                      </Button>
                  ) : previewLive ? (
                      <Button
                          onClick={() => {
                            setPreviewLive('');
                            setLiveBlob(null);
                            setShowWebcam(true);
                          }}
                          className="w-full h-14 bg-[#1A1F36] text-white rounded-[1.2rem] text-lg font-bold flex gap-2 justify-center items-center shadow-md hover:scale-[1.01]"
                      >
                        <RefreshCcw size={18} /> 다시 촬영하기
                      </Button>
                  ) : (
                      <Button
                          onClick={capture}
                          className="w-full h-14 bg-[#FF4D94] text-white rounded-[1.2rem] text-lg font-bold shadow-md animate-pulse hover:scale-[1.01]"
                      >
                        촬영하기
                      </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 최종 인증 버튼 */}
          <div className="w-full max-w-sm">
            <Button
                onClick={handleVerify}
                disabled={!repFile || !liveBlob || isVerifying || isSuccess}
                className={`w-full py-8 rounded-[24px] text-xl font-bold shadow-xl transition-all ${
                    repFile && liveBlob && !isSuccess
                        ? 'bg-gradient-to-r from-[#FF4D94] to-[#7C3AED] text-white hover:scale-[1.02] hover:shadow-2xl'
                        : 'bg-[#E6E9EF] text-[#A3ACBA] cursor-not-allowed'
                }`}
            >
              {isVerifying
                  ? 'AI 대조 분석 중...'
                  : isSuccess
                      ? '인증 완료'
                      : '사진 업로드 후 인증 시작하기'}
            </Button>
          </div>
        </div>

        <style>{`
        /* 스캔 라인 (4초, 천천히) */
        @keyframes scan-slow {
          0% { top: 5%; opacity: 0.5; }
          50% { top: 95%; opacity: 1; }
          100% { top: 5%; opacity: 0.5; }
        }
        .animate-scan-slow {
          animation: scan-slow 4s ease-in-out infinite;
        }

        /* 홀로그램 호흡 효과 */
        @keyframes float-breathing {
          0% { transform: translateY(0) scale(1); opacity: 0.5; }
          50% { transform: translateY(-4px) scale(1.05); opacity: 0.9; }
          100% { transform: translateY(0) scale(1); opacity: 0.5; }
        }
        .animate-float-breathing {
          animation: float-breathing 3s ease-in-out infinite;
        }
      `}</style>
      </div>
  );
}