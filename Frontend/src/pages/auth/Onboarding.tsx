import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as authApi from '@/api/auth';
import { useToast } from '@/components/ui/toast-context';
// api.defaults... 등을 위해 client가 필요하다면 import (단, 여기선 온보딩 성공 후 토큰 수동 세팅 등 로직 확인 필요)
import client from '@/api/_client';

import BasicInfoForm, { type BasicInfoData } from '@/components/onboarding/BasicInfoForm';
import PhotoVerification from '@/components/onboarding/PhotoVerification';
import PreferenceForm from '@/components/onboarding/PreferenceForm';

export default function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<number>(location.state?.step || 1);

  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
    profileFile: null,
    previewUrl: '',
    name: '',
    email: '',
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
        const userData: any = await authApi.getSignupDetails();

        if (userData) {
          // 1. 기본 정보 세팅
          const dateParts = userData.birthDate ? userData.birthDate.split('-') : [];
          setBasicInfo((prev) => ({
            ...prev,
            name: userData.name || '',
            email: userData.email || '',
            nickName: userData.nickname || '', // 닉네임이 없으면 빈 값으로 (사용자 입력 유도)
            gender: userData.gender as 'MALE' | 'FEMALE',
            birth: {
              year: dateParts[0] || '',
              month: dateParts[1] ? String(parseInt(dateParts[1], 10)) : '',
              day: dateParts[2] ? String(parseInt(dateParts[2], 10)) : '',
            },
          }));

          // 2. 만약 location.state로 받은 step이 없다면, status에 따라 자동 점프
          if (!location.state?.step) {
            const status = userData.status;
            const hasNickname = !!userData.nickname;

            if (status === 'VALID') {
              navigate('/home');
            } else if (status === 'PENDING_VERIFICATION') {
              setStep(3);
            } else if (status === 'JOINED' && hasNickname) {
              setStep(2);
            }
          }
        }
      } catch (error) {
        console.error('API 호출 실패:', error);
      }
    };
    fetchUserData();
  }, []);

  const handleNextStep1 = async (data: BasicInfoData) => {
    try {
      console.log('🚀 [Step 1] 기본 정보 저장 중...');

      const requestData = {
        nickName: data.nickName,
        gender: data.gender,
        birthDate: `${data.birth.year}-${data.birth.month.padStart(2, '0')}-${data.birth.day.padStart(2, '0')}`,
        mbti: `${data.mbti.ei}${data.mbti.ns}${data.mbti.ft}${data.mbti.jp}`,
      };

      const formData = new FormData();
      // 백엔드의 @RequestPart("data")와 @RequestPart("file")에 대응
      formData.append(
        'data',
        new Blob([JSON.stringify(requestData)], { type: 'application/json' })
      );

      if (data.profileFile) {
        formData.append('file', data.profileFile);
      } else {
        throw new Error('프로필 사진이 없습니다.');
      }

      await authApi.signUp(formData);
      console.log('✅ [Step 1] 저장 완료');

      setBasicInfo(data);
      setStep(2);
      window.scrollTo(0, 0);
    } catch (error) {
      console.error('❌ [Step 1] 저장 실패:', error);
      alert('기본 정보 저장에 실패했습니다. 다시 시도해주세요.');
    }
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
        await authApi.uploadVerifyPhoto(formData);
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
        preferenceIds: numericIds,
      };

      console.log('🚀 [최종 제출] 데이터 전송...');
      const resData: any = await authApi.completeOnboarding(finalPayload);

      console.log('📡 [응답 데이터]:', resData);

      // ✅ 2. 성공 판단 기준 변경 (핵심 수정)
      // "success: true"를 찾지 말고, "accessToken"이 있는지를 확인합니다.
      const newAccessToken = resData?.accessToken || resData?.data?.accessToken;

      if (newAccessToken) {
        console.log('✅ 가입 성공! 토큰 확인됨.');

        // 3. 토큰 저장
        localStorage.setItem('accessToken', newAccessToken);
        client.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        console.log('🔑 토큰 저장 완료');

        toast('가입 완료! 환영합니다 🎉', 'success');

        // 4. 강제 이동
        setTimeout(() => {
          window.location.href = '/home';
        }, 1500);
      } else {
        console.warn('⚠️ 응답은 왔으나 토큰이 없습니다:', resData);
        // 혹시 모르니 그냥 이동 시도 (서버가 200이면 가입은 된 것이므로)
        toast('가입 완료 (토큰 없음). 홈으로 이동합니다.', 'warning');
        setTimeout(() => {
          window.location.href = '/home';
        }, 1500);
      }
    } catch (error: any) {
      console.error('❌ 가입 에러:', error);
      toast('가입 처리 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
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
