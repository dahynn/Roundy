import React, { useState, useRef } from 'react';
import { Camera, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';

interface PhotoVerificationProps {
    initialFile: File | null;
    initialPreview: string;
    onNext: (file: File, preview: string) => void;
    onBack: () => void;
}

export default function PhotoVerification({ initialFile, initialPreview, onNext, onBack }: PhotoVerificationProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [verifyFile, setVerifyFile] = useState<File | null>(initialFile);
    const [previewUrl, setPreviewUrl] = useState<string>(initialPreview);

    // 이미지 조작 상태
    const [imgPos, setImgPos] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1.2);
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setVerifyFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setImgPos({ x: 0, y: 0 });
            setScale(1.2);
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (!previewUrl) return;
        const delta = e.deltaY * -0.001;
        setScale((prev) => Math.min(Math.max(1, prev + delta), 3));
    };

    return (
        <div
            className="w-full flex flex-col items-center"
            onMouseUp={() => setIsDragging(false)}
            onMouseMove={(e) => {
                if (!isDragging) return;
                setImgPos({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
            }}
        >
            <div className="w-full max-w-xl flex items-center justify-between mb-8 z-10 px-4">
                <button onClick={onBack} className="p-2 hover:bg-white/50 rounded-full transition-all">
                    <ChevronLeft size={24} />
                </button>
                <div className="w-10" />
            </div>

            <div className="relative w-full max-w-xl bg-white/90 backdrop-blur-3xl rounded-[60px] p-12 md:p-16 shadow-2xl border border-white z-10 flex flex-col items-center">
                <div className="self-start flex items-center gap-3 mb-10 px-2">
                    <div className="w-10 h-10 bg-[#FF4D94] rounded-full flex items-center justify-center text-white font-black text-lg shadow-md shadow-pink-100">2</div>
                    <h3 className="text-2xl font-black text-[#1A1F36]">인증 사진 등록</h3>
                </div>

                <div
                    className={`w-full aspect-[4/4.5] rounded-[40px] border-2 border-dashed relative overflow-hidden mb-6 transition-all flex flex-col items-center justify-center ${previewUrl ? 'border-[#FF4D94] cursor-move bg-black' : 'border-pink-200 bg-pink-50/30'}`}
                    onMouseDown={(e) => {
                        if (!previewUrl) return;
                        setIsDragging(true);
                        setStartPos({ x: e.clientX - imgPos.x, y: e.clientY - imgPos.y });
                    }}
                    onWheel={handleWheel}
                >
                    {previewUrl ? (
                        <img src={previewUrl} style={{ transform: `translate(${imgPos.x}px, ${imgPos.y}px) scale(${scale})` }} className="w-full h-full object-cover pointer-events-none" alt="Preview" />
                    ) : (
                        <div className="flex flex-col items-center px-6">
                            <div className="w-20 h-20 bg-pink-100/50 rounded-full flex items-center justify-center mb-6">
                                <Camera className="text-[#FF4D94]" size={40} />
                            </div>
                            <h4 className="text-2xl font-black text-[#1A1F36] mb-3">사진 업로드</h4>
                            <p className="text-[#697386] font-medium text-center mb-8">얼굴 정면이 선명한 사진을 선택해주세요.</p>
                            <Button onClick={() => fileInputRef.current?.click()} className="px-10 py-7 bg-[#FF4D94] text-white rounded-full font-bold shadow-lg">파일 선택하기</Button>
                        </div>
                    )}
                </div>

                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

                <Button
                    disabled={!verifyFile}
                    onClick={() => verifyFile && onNext(verifyFile, previewUrl)}
                    className={`w-full py-9 rounded-[30px] text-xl font-bold shadow-xl transition-all ${verifyFile ? 'bg-gradient-to-r from-[#FF4D94] via-[#FF7EB3] to-[#7C3AED] text-white' : 'bg-gray-100 text-gray-300'}`}
                >
                    다음 단계로
                </Button>
            </div>
        </div>
    );
}