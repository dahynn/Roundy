import { useState, useEffect } from 'react';
import api from '@/utils/api';
import BasicInfoForm, { type BasicInfoData } from '@/components/onboarding/BasicInfoForm';

export default function Onboarding() {
  const [step, setStep] = useState<number>(1);
  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
    profileFile: null,
    previewUrl: '',
    nickName: '',
    gender: null,
    birth: { year: '', month: '', day: '' },
    mbti: { ei: '', ns: '', ft: '', jp: '' },
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get('/auth/signup/details');

        // ✅ [디버깅] 이 로그가 브라우저 콘솔에 찍히는지 꼭 확인하세요!
        console.log('백엔드 응답 데이터 원본:', response);

        // Postman 구조에 맞춰 데이터 추출
        const userData = response.data?.data || response.data || response;

        if (userData && userData.name) {
          console.log('파싱된 유저 정보:', userData);

          const dateParts = userData.birthDate ? userData.birthDate.split('-') : [];

          setBasicInfo((prev) => ({
            ...prev,
            nickName: userData.name, // "오남택"
            gender: userData.gender as 'MALE' | 'FEMALE', // "MALE"
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

  return (
    <div className="min-h-screen bg-[#FDF2F8] flex flex-col items-center py-20 relative overflow-hidden font-['Pretendard']">
      <div className="w-full px-4 z-10 flex flex-col items-center flex-1">
        {step === 1 && (
          <BasicInfoForm
            initialData={basicInfo}
            onNext={(data) => {
              setBasicInfo(data);
              setStep(2);
            }}
          />
        )}
      </div>
    </div>
  );
}
