import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import BasicInfoForm, { type BasicInfoData } from '@/components/onboarding/BasicInfoForm';
import PhotoVerification from '@/components/onboarding/PhotoVerification';
import PreferenceForm from '@/components/onboarding/PreferenceForm';

export default function Onboarding() {
    const navigate = useNavigate();
    const [step, setStep] = useState<number>(1);

    // Step 1: 기본 정보
    const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
        profileFile: null,
        previewUrl: '',
        nickName: '',
        gender: null,
        birth: { year: '', month: '', day: '' },
        mbti: { ei: '', ns: '', ft: '', jp: '' },
    });

    // Step 2: 인증 사진
    const [verifyFile, setVerifyFile] = useState<File | null>(null);
    const [verifyPreview, setVerifyPreview] = useState<string>('');

    // Step 3: 취향 태그
    const [_preferences, setPreferences] = useState<string[]>([]);

    // --- [핸들러] 단계 이동 로직 ---

    const handleNextStep1 = (data: BasicInfoData) => {
        setBasicInfo(data); // 1단계 데이터 저장
        setStep(2);         // 2단계로 이동
        window.scrollTo(0, 0);
    };

    const handleNextStep2 = (file: File, preview: string) => {
        setVerifyFile(file);      // 2단계 데이터 저장
        setVerifyPreview(preview);
        setStep(3);               // 3단계로 이동
        window.scrollTo(0, 0);
    };

    const handleFinalSubmit = async (selectedIds: string[]) => {
        setPreferences(selectedIds); // 3단계 데이터 저장

        // TODO: 백엔드 전송 로직 (FormData 구성 예시)
        const formData = new FormData();
        formData.append('nickname', basicInfo.nickName);
        if (basicInfo.profileFile) formData.append('profileImage', basicInfo.profileFile);
        if (verifyFile) formData.append('verifyImage', verifyFile);
        formData.append('preferences', JSON.stringify(selectedIds));

        console.log('🎉 회원가입 완료 요청!', formData);
        navigate('/home');
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        } else {
            navigate(-1);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDF2F8] flex flex-col items-center py-20 relative overflow-hidden font-['Pretendard']">
            {/* 공통 배경 효과 */}
            <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-pink-200/20 rounded-full blur-[120px] pointer-events-none" />

            {/* 단계별 컴포넌트 렌더링 */}
            <div className="w-full px-4 z-10 flex flex-col items-center flex-1">
                {step === 1 && (
                    <BasicInfoForm
                        initialData={basicInfo}
                        onNext={handleNextStep1}
                    />
                )}

                {step === 2 && (
                    <PhotoVerification
                        initialFile={verifyFile}
                        initialPreview={verifyPreview}
                        onNext={handleNextStep2}
                        onBack={handleBack}
                    />
                )}

                {step === 3 && (
                    <PreferenceForm
                        onBack={handleBack}
                        onSubmit={handleFinalSubmit}
                    />
                )}
            </div>

            {/* ✅ [추가] Footer 구현 완료 */}
            <footer className="mt-16 mb-8 w-full flex flex-col items-center justify-center gap-4 z-10">
                <div className="flex items-center gap-6">
                    <Link to="/terms" className="text-xs font-semibold text-gray-400 hover:text-[#FF4D94] transition-colors duration-200">
                        이용약관
                    </Link>
                    <div className="w-[1px] h-3 bg-gray-300" />
                    <Link to="/privacy" className="text-xs font-semibold text-gray-400 hover:text-[#FF4D94] transition-colors duration-200">
                        개인정보처리방침
                    </Link>
                    <div className="w-[1px] h-3 bg-gray-300" />
                    <Link to="/contact" className="text-xs font-semibold text-gray-400 hover:text-[#FF4D94] transition-colors duration-200">
                        문의하기
                    </Link>
                </div>
                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
                    © 2026 ROUNDY. PREMIUM MEMBERSHIP.
                </p>
            </footer>
        </div>
    );
}