import client from './_client';

/**
 * 얼굴 대조 인증용 대표 이미지 URL 조회
 */
export const getVerificationImage = () => client.get('/verification/verify');

/**
 * 얼굴 대조 본인 인증 수행
 */
export const verifyFaceMatch = (formData: FormData) =>
    client.post('/verification/verify', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
