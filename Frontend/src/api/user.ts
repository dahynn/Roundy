import client from './_client';

/**
 * 로그아웃
 */
export const logout = () => client.post('/auth/logout');

/**
 * 회원탈퇴
 */
export const withdraw = () => client.delete('/auth/withdraw');

/**
 * 현재 로그인한 유저 기본 정보 조회
 */
export const getMyInfo = () => client.get('/auth/signup/details');

/**
 * 프로필 정보 수정
 */
export const updateProfile = (data: any, profileImage?: File | null, verificationImage?: File | null) => {
    const formData = new FormData();
    if (data) {
        formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    }
    if (profileImage) {
        formData.append('profileImage', profileImage);
    }
    if (verificationImage) {
        formData.append('verificationImage', verificationImage);
    }

    return client.patch('/auth/profile', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};
