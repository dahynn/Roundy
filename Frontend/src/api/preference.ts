import client from './_client';

/**
 * Preference 타입
 */
export type PreferenceType =
    | 'RELATIONSHIP_GOAL' // 선호 관계
    | 'DATING_STYLE' // 연애 스타일
    | 'DATE_PREFERENCE' // 선호 데이트
    | 'PERSONALITY' // 성격
    | 'APPEARANCE' // 외모
    | 'TALENT'; // 재능

/**
 * 개별 Preference 응답 타입
 */
export interface PreferenceResponse {
    id: number;
    type: PreferenceType;
    content: string;
}

/**
 * 사용자 Preference 응답 타입 (타입별 그룹핑)
 */
export interface UserPreferenceResponse {
    preferences: {
        [key in PreferenceType]?: string[];
    };
}

/**
 * 취향 항목 목록 전체 조회
 */
export const getPreferences = (): Promise<PreferenceResponse[]> => client.get('/preferences');

/**
 * 내 선호 정보 조회
 */
export const getMyPreferences = (): Promise<UserPreferenceResponse> => client.get('/preferences/me');

/**
 * 내 선호 정보 수정
 */
export const updateMyPreferences = (data: { preferenceIds: number[] }): Promise<void> =>
    client.put('/preferences/me', data);

/**
 * 특정 유저 Preference 조회 (매칭 화면에서 상대방 정보 표시용)
 * @param userId - 조회할 유저 ID
 */
export const getUserPreferences = (userId: number): Promise<UserPreferenceResponse> =>
    client.get(`/preferences/${userId}`);
