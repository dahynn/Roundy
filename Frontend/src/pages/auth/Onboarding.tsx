import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/utils/api';

import BasicInfoForm, { type BasicInfoData } from '@/components/onboarding/BasicInfoForm';
import PhotoVerification from '@/components/onboarding/PhotoVerification';
import PreferenceForm from '@/components/onboarding/PreferenceForm';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);

  // 1단계: 기본 정보 상태
  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
    profileFile: null,
    previewUrl: '',
    nickName: '',
    gender: null,
    birth: { year: '', month: '', day: '' },
    mbti: { ei: '', ns: '', ft: '', jp: '' },
  });

  // 2단계: 인증 사진 상태
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyPreview, setVerifyPreview] = useState<string>('');

  // ✅ 데이터 호출 로직 (최초 진입 시)
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get('/auth/signup/details');
        const userData = response.data?.data || response.data || response;

        if (userData && userData.name) {
          const dateParts = userData.birthDate ? userData.birthDate.split('-') : [];
          setBasicInfo((prev) => ({
            ...prev,
            nickName: userData.name,
            gender: userData.gender as 'MALE' | 'FEMALE',
            birth: {
              year: dateParts[0] || '',
              month: dateParts[1] ? String(parseInt(dateParts[1], 10)) : '',
              day: dateParts[2] ? String(parseInt(dateParts[2], 10)) : '',
            },
          }));
        }
      } catch (error) {
        console.error('API 호출 실패:', error);
      }
    };
    fetchUserData();
  }, []);

  // --- [핸들러] 단계 이동 ---

  // 1단계 -> 2단계 이동
  const handleNextStep1 = (data: BasicInfoData) => {
    setBasicInfo(data);
    setStep(2);
    window.scrollTo(0, 0);
  };

  // ✅ 2단계 -> 3단계 이동 및 사진 업로드
  const handleNextStep2 = async (file: File, preview: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file); // 명세서 Key: file

      // 🛠️ 경로 수정: /api 중복을 방지하기 위해 '/auth/verify'로 호출
      const response = await api.post('/auth/verify', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        console.log('검증 사진 등록 완료');
        setVerifyFile(file);
        setVerifyPreview(preview);
        setStep(3); // 성공 시 3단계(취향 선택)로 이동
        window.scrollTo(0, 0);
      }
    } catch (error: any) {
      console.error('검증 사진 업로드 오류 상세:', error.response?.data || error.message);
      // 백엔드 개발자 유다현님이 원인을 찾을 수 있게 에러 메시지를 구체적으로 띄웁니다.
      const errorMsg = error.response?.data?.message || '사진 업로드에 실패했습니다.';
      alert(`${errorMsg} (상태코드: ${error.response?.status})`);
    }
  };

  // 뒤로 가기
  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigate(-1);
  };

  // ✅ 3단계 최종 제출 (POST 연동 준비)
  const handleFinalSubmit = async (selectedIds: string[]) => {
    // 폼 데이터 구성 및 최종 API 호출 로직이 들어갈 자리입니다.
    console.log('최종 제출 데이터:', { basicInfo, verifyFile, selectedIds });
  };

  return (
    <div className="min-h-screen bg-[#FDF2F8] flex flex-col items-center py-20 relative overflow-hidden font-['Pretendard']">
      <div className="w-full px-4 z-10 flex flex-col items-center flex-1">
        {/* Step 1: 기본 정보 입력 */}
        {step === 1 && <BasicInfoForm initialData={basicInfo} onNext={handleNextStep1} />}

        {/* Step 2: 사진 인증 및 촬영 */}
        {step === 2 && (
          <PhotoVerification
            initialFile={verifyFile}
            initialPreview={verifyPreview}
            onNext={handleNextStep2}
            onBack={handleBack}
          />
        )}

        {/* Step 3: 취향 선택 */}
        {step === 3 && <PreferenceForm onBack={handleBack} onSubmit={handleFinalSubmit} />}
      </div>
    </div>
  );
}
