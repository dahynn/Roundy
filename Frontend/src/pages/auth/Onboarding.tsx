import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/utils/api';

import BasicInfoForm, { type BasicInfoData } from '@/components/onboarding/BasicInfoForm';
import PhotoVerification from '@/components/onboarding/PhotoVerification';
import PreferenceForm from '@/components/onboarding/PreferenceForm';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);

  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
    profileFile: null,
    previewUrl: '',
    nickName: '',
    gender: null,
    birth: { year: '', month: '', day: '' },
    mbti: { ei: '', ns: '', ft: '', jp: '' },
  });

  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyPreview, setVerifyPreview] = useState<string>('');

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

  const handleNextStep1 = (data: BasicInfoData) => {
    setBasicInfo(data);
    setStep(2);
    window.scrollTo(0, 0);
  };

  const handleNextStep2 = (file: File, preview: string) => {
    console.log('🚀 [Step 2] 낙관적 업데이트');
    setVerifyFile(file);
    setVerifyPreview(preview);
    setStep(3);
    window.scrollTo(0, 0);

    const uploadInBackground = async () => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        await api.post('/auth/verify', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } catch (error) {
        console.error('❌ 사진 업로드 실패:', error);
      }
    };
    uploadInBackground();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigate(-1);
  };

  const handleFinalSubmit = async (selectedIds: string[]) => {
    try {
      const numericIds = selectedIds.map((id) => parseInt(id, 10));
      const finalPayload = {
        mbti: `${basicInfo.mbti.ei}${basicInfo.mbti.ns}${basicInfo.mbti.ft}${basicInfo.mbti.jp}`,
        birthDate: `${basicInfo.birth.year}-${basicInfo.birth.month.padStart(2, '0')}-${basicInfo.birth.day.padStart(2, '0')}`,
        gender: basicInfo.gender,
        preferenceIds: numericIds,
      };

      console.log('🚀 [최종 제출] 데이터 전송...');
      const response = await api.post('/auth/onboarding', finalPayload);

      // ✅ 1. 응답 데이터 확보
      // Axios 설정에 따라 response 자체가 데이터일 수도 있고 response.data일 수도 있음
      const resData = response.data || response;

      console.log('📡 [응답 데이터]:', resData);

      // ✅ 2. 성공 판단 기준 변경 (핵심 수정)
      // "success: true"를 찾지 말고, "accessToken"이 있는지를 확인합니다.
      const newAccessToken = resData?.accessToken || resData?.data?.accessToken;

      if (newAccessToken) {
        console.log('✅ 가입 성공! 토큰 확인됨.');

        // 3. 토큰 저장
        localStorage.setItem('accessToken', newAccessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        console.log('🔑 토큰 저장 완료');

        alert('가입 완료! 🎉');

        // 4. 강제 이동
        window.location.href = '/home';
      } else {
        console.warn('⚠️ 응답은 왔으나 토큰이 없습니다:', resData);
        // 혹시 모르니 그냥 이동 시도 (서버가 200이면 가입은 된 것이므로)
        alert('가입 완료 (토큰 없음). 홈으로 이동합니다.');
        window.location.href = '/home';
      }
    } catch (error: any) {
      console.error('❌ 가입 에러:', error);
      alert('가입 처리 중 오류가 발생했습니다.');
    }
  };
  return (
    <div className="min-h-screen bg-[#FDF2F8] flex flex-col items-center py-20 relative font-['Pretendard']">
      <div className="w-full px-4 z-10 flex flex-col items-center flex-1">
        {step === 1 && <BasicInfoForm initialData={basicInfo} onNext={handleNextStep1} />}
        {step === 2 && (
          <PhotoVerification
            initialFile={verifyFile}
            initialPreview={verifyPreview}
            onNext={handleNextStep2}
            onBack={handleBack}
          />
        )}
        {step === 3 && <PreferenceForm onBack={handleBack} onSubmit={handleFinalSubmit} />}
      </div>
    </div>
  );
}
