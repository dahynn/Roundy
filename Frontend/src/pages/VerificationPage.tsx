import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcw, ImagePlus } from 'lucide-react';
// import { verifyFace, api } from '@/lib/api'; // 나중에 주석 해제

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

  // 임시 세션 ID
  const TEMP_SESSION_ID = 1;

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

  /**
   * 개발용 프리패스 핸들러: API 통신 없이 무조건 성공 처리
   */
  const handleVerify = async () => {
    if (!repFile || !liveBlob) return;

    setIsVerifying(true);

    // AI 분석 느낌을 주기 위해 1.5초 정도 의도적 지연을 줍니다.
    setTimeout(() => {
      /* // [나중에 API 확정 시 적용할 실제 로직]
      try {
        const faceResponse = await verifyFace(repFile, liveBlob);
        if (faceResponse.data.success) {
          const joinResponse = await api.post(`/api/sessions/${TEMP_SESSION_ID}/participants`);
          if (joinResponse.data.success) {
            navigate(`/loading/${TEMP_SESSION_ID}`);
          }
        }
      } catch (error) { ... }
      */

      // 현재는 무조건 성공!
      setIsVerifying(false);
      setIsSuccess(true);

      // 알림 창 없이 바로 넘어가고 싶으시면 alert 주석 처리 하세요.
      alert('인증 성공! 대기방으로 이동합니다.');
      navigate('/loading');
    }, 1500);
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-blue-100/40 via-pink-100/40 to-purple-100/40 p-6 font-['Pretendard']"
      onMouseUp={() => setIsDragging(false)}
      onMouseMove={(e) => {
        if (!isDragging) return;
        setImgPos({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
      }}
    >
      <div className="text-center mb-16">
        <h1 className="text-5xl font-extrabold text-[#1A1F36] pb-10 tracking-tight">
          AI 페이스매칭
        </h1>
        <div className="text-[#697386] text-lg leading-relaxed pt-2">
          <p>대표 사진과 실시간 본인 사진을 업로드해주세요.</p>
          <p className="font-bold text-[#FF4D94]">
            AI 본인인증을 통과해야 소개팅 대기방에 입장하실 수 있습니다.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center w-full max-w-5xl">
        <div className="flex flex-col md:flex-row gap-8 w-full justify-center mb-12 items-stretch">
          <Card className="flex-1 max-w-[380px] bg-white/80 backdrop-blur-md border-none shadow-xl rounded-[32px] flex flex-col overflow-hidden">
            <CardContent className="flex flex-col items-center p-8 h-full flex-1">
              <div className="flex self-start items-center gap-3 mb-8">
                <span className="flex items-center justify-center w-8 h-8 bg-[#FF4D94] text-white rounded-full font-bold">
                  1
                </span>
                <h3 className="text-xl font-bold text-[#1A1F36]">대표 사진 등록</h3>
              </div>
              <div
                className={`w-full aspect-video rounded-[24px] border-2 border-dashed relative overflow-hidden mb-6 transition-all ${previewRep ? 'cursor-move border-[#FF4D94]' : 'border-[#F0F2F5] bg-white'}`}
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
                  <div className="flex flex-col items-center py-10">
                    <ImagePlus className="text-[#FF4D94] mb-4" size={28} />
                    <span className="text-md font-bold text-[#1A1F36]">사진 업로드</span>
                  </div>
                )}
              </div>
              <div className="mt-auto w-full flex flex-col items-center">
                <p className="mb-4 text-[11px] text-[#8792A2] font-medium">
                  드래그로 위치 이동, 휠로 확대/축소
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
                  className="w-full py-5 bg-[#FF4D94] text-white rounded-2xl text-md font-bold shadow-lg"
                >
                  사진 선택하기
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 max-w-[380px] bg-white/80 backdrop-blur-md border-none shadow-xl rounded-[32px] flex flex-col overflow-hidden">
            <CardContent className="flex flex-col items-center p-8 h-full flex-1">
              <div className="flex self-start items-center gap-3 mb-8">
                <span className="flex items-center justify-center w-8 h-8 bg-[#FF4D94] text-white rounded-full font-bold">
                  2
                </span>
                <h3 className="text-xl font-bold text-[#1A1F36]">실시간 본인 사진</h3>
              </div>
              <div className="w-full aspect-video bg-[#0F111A] rounded-[24px] relative overflow-hidden mb-6 flex items-center justify-center border-2 border-[#F0F2F5]">
                {previewLive ? (
                  <img src={previewLive} className="w-full h-full object-cover" alt="실시간" />
                ) : showWebcam ? (
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="relative flex items-center justify-center w-full h-full">
                    <div className="w-40 h-52 border-2 border-[#FF4D94]/30 rounded-full flex items-center justify-center">
                      <div className="w-full h-[1px] bg-[#FF4D94] shadow-[0_0_10px_#FF4D94] animate-scan opacity-50" />
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-auto w-full flex flex-col items-center">
                <p className="mb-4 text-[12px] text-[#8792A2] font-medium">
                  웹캠으로 현재 모습을 촬영해주세요
                </p>
                {!showWebcam && !previewLive ? (
                  <Button
                    onClick={() => setShowWebcam(true)}
                    className="w-full py-5 bg-[#FF4D94] text-white rounded-2xl text-md font-bold shadow-lg"
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
                    className="w-full py-5 bg-[#1A1F36] text-white rounded-2xl text-md font-bold flex gap-2 justify-center items-center shadow-lg"
                  >
                    <RefreshCcw size={18} /> 다시 촬영하기
                  </Button>
                ) : (
                  <Button
                    onClick={capture}
                    className="w-full py-5 bg-[#FF4D94] text-white rounded-2xl text-md font-bold shadow-lg animate-pulse"
                  >
                    촬영하기
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full max-w-sm">
          <Button
            onClick={handleVerify}
            disabled={!repFile || !liveBlob || isVerifying || isSuccess}
            className={`w-full py-9 rounded-[24px] text-xl font-bold shadow-2xl transition-all ${repFile && liveBlob && !isSuccess ? 'bg-gradient-to-r from-[#FF4D94] to-[#7C3AED] text-white hover:scale-[1.02]' : 'bg-[#E6E9EF]/60 text-[#A3ACBA] cursor-not-allowed'}`}
          >
            {isVerifying
              ? 'AI 대조 분석 중...'
              : isSuccess
                ? '인증 완료'
                : '사진 업로드 후 인증 시작'}
          </Button>
        </div>
      </div>
      <style>{`@keyframes scan { 0% { transform: translateY(-70px); } 100% { transform: translateY(70px); } } .animate-scan { animation: scan 2s linear infinite alternate; }`}</style>
    </div>
  );
}
