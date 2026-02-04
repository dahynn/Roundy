import client from './_client';

/**
 * 취향 항목 목록 전체 조회
 */
export const getPreferences = () => client.get('/preferences');

/**
 * 내 선호 정보 조회
 */
export const getMyPreferences = () => client.get('/preferences/me');

/**
 * 내 선호 정보 수정
 */
export const updateMyPreferences = (data: { preferenceIds: number[] }) => client.put('/preferences/me', data);
