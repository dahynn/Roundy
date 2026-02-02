import client from './_client';

/**
 * 취향 항목 목록 전체 조회
 */
export const getPreferences = () => client.get('/preferences');
