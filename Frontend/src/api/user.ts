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
