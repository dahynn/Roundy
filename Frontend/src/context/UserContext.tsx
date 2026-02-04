import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback } from 'react';
import { getMyInfo } from '@/api/user';

interface UserInfo {
    id: number;
    name: string;
    birthDate: string;
    gender: string;
    nickname: string;
    profileImageUrl: string | null;
    verificationImageUrl: string | null;
    role: string;
    status: string;
}

interface UserContextType {
    userInfo: UserInfo | null;
    isLoading: boolean;
    refreshUser: () => Promise<void>;
    updateUserLocally: (data: Partial<UserInfo>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const refreshUser = useCallback(async () => {
        try {
            setIsLoading(true);
            const response: any = await getMyInfo();
            // 백엔드 응답 구조에 따라 response.data 또는 response 확인 필요
            // 보통 CommonResponse 구조라면 response.data.data 일 수 있음.
            // MyPage.tsx의 기존 로직을 참고하여 일단 저장
            setUserInfo(response.data || response);
        } catch (error) {
            console.error('Failed to fetch user info:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateUserLocally = useCallback((data: Partial<UserInfo>) => {
        setUserInfo((prev) => (prev ? { ...prev, ...data } : null));
    }, []);

    return (
        <UserContext.Provider value={{ userInfo, isLoading, refreshUser, updateUserLocally }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
