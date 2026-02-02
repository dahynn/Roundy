import client from './_client';

/**
 * 카카오 로그인 콜백에서 받은 토큰 검증 및 상세 정보 조회
 */
export const getSignupDetails = () => client.get('/auth/signup/details');

/**
 * 회원가입(기본 정보 입력) - Step 1
 */
export const signUp = (formData: FormData) =>
    client.post('/auth/signup', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });

/**
 * 온보딩(취향 정보 입력) 최종 제출 - Step 3
 */
export const completeOnboarding = (data: { preferenceIds: number[] }) => client.post('/auth/onboarding', data);

/**
 * 인증용 사진 업로드
 */
export const uploadVerifyPhoto = (formData: FormData) =>
    client.post('/auth/verify', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
