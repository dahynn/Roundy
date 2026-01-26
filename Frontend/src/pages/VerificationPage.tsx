import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcw, ImagePlus, Move, ZoomIn } from 'lucide-react';
import { verifyFace } from '@/lib/api';

export default function VerificationPage() {
  const [repFile, setRepFile] = useState<File | null>(null);
  const [liveBlob, setLiveBlob] = useState<Blob | null>(null);
  const [previewRep, setPreviewRep] = useState<string>('');
  const [previewLive, setPreviewLive] = useState<string>('');

  // 1. 위치 및 줌 상태 관리
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
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(1, scale + delta), 3);
    setScale(newScale);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!previewRep) return;
    setIsDragging(true);
    setStartPos({ x: e.clientX - imgPos.x, y: e.clientY - imgPos.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setImgPos({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
  };

  const onMouseUp = () => setIsDragging(false);

  // 사진 촬영 로직
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setPreviewLive(imageSrc);
      fetch(imageSrc)
        .then((res) => res.blob())
        .then((blob) => {
          setLiveBlob(blob);
          setShowWebcam(false); // 촬영 후 카메라는 끎
        });
    }
  }, [webcamRef]);

  // 재촬영 모드 전환 로직
  const retake = () => {
    setPreviewLive(''); // 기존 촬영 이미지 미리보기 제거
    setLiveBlob(null); // 저장된 blob 데이터 초기화
    setShowWebcam(true); // 카메라 다시 켜기
  };

  const handleVerify = async () => {
    if (!repFile || !liveBlob) return;
    setIsVerifying(true);
    try {
      const response = await verifyFace(repFile, liveBlob);
      if (response.data.success) {
        setIsSuccess(true);
      } else {
        alert('얼굴 인증에 문제가 있습니다. 사진을 바꿔 다시 시도해주세요.');
      }
    } catch (error) {
      alert('서버 통신 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-blue-100/40 via-pink-100/40 to-purple-100/40 p-6 font-['Pretendard']"
      onMouseUp={onMouseUp}
    >
      <div className="text-center mb-16">
        <h1 className="text-5xl font-extrabold text-[#1A1F36] pb-10 tracking-tight">
          AI 페이스매칭
        </h1>
        <div className="text-[#697386] text-lg leading-relaxed pt-2">
          <p>대표 사진과 실시간 본인 사진을 업로드해주세요.</p>
          <p className="font-bold text-[#FF4D94]">
            AI가 대조해 본인임을 인증해야 서비스에 접속할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center w-full max-w-5xl">
        <div className="flex flex-col md:flex-row gap-8 w-full justify-center mb-12 items-stretch">
          {/* 1. 대표 사진 등록 (줌 & 드래그) */}
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
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onWheel={handleWheel}
              >
                {previewRep ? (
                  <>
                    <img
                      src={previewRep}
                      style={{
                        transform: `translate(${imgPos.x}px, ${imgPos.y}px) scale(${scale})`,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                      }}
                      className="w-full h-full object-cover pointer-events-none"
                      alt="대표"
                    />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <div className="bg-black/60 p-1.5 rounded-full text-white">
                        <Move size={14} />
                      </div>
                      <div className="bg-[#FF4D94] p-1.5 rounded-full text-white">
                        <ZoomIn size={14} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center py-10">
                    <div className="w-16 h-16 bg-[#FFF0F6] rounded-full flex items-center justify-center mb-4">
                      <ImagePlus className="text-[#FF4D94]" size={28} />
                    </div>
                    <span className="text-md font-bold text-[#1A1F36]">사진 업로드</span>
                  </div>
                )}
              </div>

              <div className="mt-auto w-full flex flex-col items-center">
                <p className="mb-4 text-[12px] text-[#8792A2] font-medium">
                  드래그로 사진 이동, 휠로 확대/축소하여 얼굴 정면에 맞춰주세요.
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
                  {repFile ? '사진 변경하기' : '파일 선택하기'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 2. 실시간 본인 사진 (촬영/재촬영 로직 적용) */}
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

              <div className="mt-auto w-full flex flex-col items-center text-center">
                <p className="mb-4 text-[12px] text-[#8792A2] font-medium">
                  연결된 웹캠으로 현재 모습을 촬영해주세요.
                </p>

                {/* 버튼 상태 분기 처리 */}
                {!showWebcam && !previewLive ? (
                  // 초기 상태: 카메라 켜기
                  <Button
                    onClick={() => setShowWebcam(true)}
                    className="w-full py-5 bg-[#FF4D94] text-white rounded-2xl text-md font-bold shadow-lg"
                  >
                    카메라 켜기
                  </Button>
                ) : previewLive ? (
                  // 촬영 완료 상태: 다시 촬영하기 (검은색 테마로 가독성 확보)
                  <Button
                    onClick={retake}
                    className="w-full py-5 bg-[#1A1F36] text-white rounded-2xl text-md font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-black transition-colors"
                  >
                    <RefreshCcw size={18} /> 다시 촬영하기
                  </Button>
                ) : (
                  // 카메라 켜진 상태: 촬영하기
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

        {/* 3. 인증 시작 버튼 */}
        <div className="w-full max-w-sm">
          <Button
            onClick={handleVerify}
            disabled={!repFile || !liveBlob || isVerifying || isSuccess}
            className={`w-full py-9 rounded-[24px] text-xl font-bold shadow-2xl transition-all ${
              repFile && liveBlob && !isSuccess
                ? 'bg-gradient-to-r from-[#FF4D94] to-[#7C3AED] text-white hover:scale-[1.02]'
                : 'bg-[#E6E9EF]/60 text-[#A3ACBA] cursor-not-allowed'
            }`}
          >
            {isVerifying
              ? 'AI 대조 분석 중...'
              : isSuccess
                ? '본인 인증 완료'
                : '사진 업로드 후 인증 시작'}
          </Button>

          {isSuccess && (
            <Button className="w-full mt-6 py-6 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-lg font-bold animate-bounce shadow-lg">
              라운디 시작하기 →
            </Button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scan { 0% { transform: translateY(-70px); } 100% { transform: translateY(70px); } }
        .animate-scan { animation: scan 2s linear infinite alternate; }
      `}</style>
    </div>
  );
}
