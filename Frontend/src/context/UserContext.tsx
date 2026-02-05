import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
    const [isLoading, setIsLoading] = useState(true); // Start with true to fetch initial data

    const refreshUser = useCallback(async () => {
        try {
            setIsLoading(true);
            const response: any = await getMyInfo();
            setUserInfo(response.data || response);
        } catch (error) {
            console.error('Failed to fetch user info:', error);
            setUserInfo(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

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
