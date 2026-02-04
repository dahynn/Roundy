import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { getMyInfo, updateProfile } from '@/api/user';
import { uploadVerifyPhoto } from '@/api/auth';
import { useToast } from '@/components/ui/toast-context';
import { useUser } from '@/context/UserContext';
import { Skeleton } from '@/components/ui/skeleton';
import BasicInfoForm, { type BasicInfoData } from '@/components/onboarding/BasicInfoForm';
import PhotoVerification from '@/components/onboarding/PhotoVerification';

export default function ProfileEditPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { refreshUser } = useUser();
    const [activeTab, setActiveTab] = useState<'basic' | 'verification'>('basic');
    const [isLoading, setIsLoading] = useState(true);

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
                setIsLoading(true);
                const response: any = await getMyInfo();
                const userData = response.data || response;

                if (userData) {
                    const dateParts = userData.birthDate ? userData.birthDate.split('-') : [];
                    const mbtiChars = userData.mbti?.split('') || [];

                    setBasicInfo({
                        profileFile: null,
                        previewUrl: userData.profileImageUrl || '',
                        name: userData.name || '',
                        email: userData.email || '',
                        nickName: userData.nickname || '',
                        gender: userData.gender as 'MALE' | 'FEMALE',
                        birth: {
                            year: dateParts[0] || '',
                            month: dateParts[1] ? String(parseInt(dateParts[1], 10)) : '',
                            day: dateParts[2] ? String(parseInt(dateParts[2], 10)) : '',
                        },
                        mbti: {
                            ei: mbtiChars[0] || '',
                            ns: mbtiChars[1] || '',
                            ft: mbtiChars[2] || '',
                            jp: mbtiChars[3] || '',
                        },
                    });

                    setVerifyPreview(userData.verificationImageUrl || '');
                }
            } catch (error) {
                console.error('내 정보 조회 실패:', error);
                toast('정보를 불러오는데 실패했습니다.', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchUserData();
    }, [toast]);

    const handleUpdateBasic = async (data: BasicInfoData) => {
        try {
            const requestData = {
                nickName: data.nickName,
                gender: data.gender,
                birthDate: `${data.birth.year}-${data.birth.month.padStart(2, '0')}-${data.birth.day.padStart(2, '0')}`,
                mbti: `${data.mbti.ei}${data.mbti.ns}${data.mbti.ft}${data.mbti.jp}`,
            };

            await updateProfile(requestData, data.profileFile);
            toast('프로필 기본 정보가 수정되었습니다.', 'success');
            refreshUser();
            navigate('/mypage');
        } catch (error) {
            console.error('프로필 수정 실패:', error);
            toast('수정에 실패했습니다. 다시 시도해주세요.', 'error');
        }
    };

    const handleUpdateVerification = async (file: File) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            // 회원가입 시 사용했던 것과 동일한 API 호출 (AI 인증용 업로드)
            await uploadVerifyPhoto(formData);

            toast('인증이 완료되었습니다.', 'success');
            refreshUser();
            navigate('/mypage');
        } catch (error) {
            console.error('인증 사진 제출 실패:', error);
            toast('인증 제출에 실패했습니다.', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#FDF2F8] dark:bg-gray-950 flex flex-col items-center py-10 md:py-20 font-['Pretendard']">
                <div className="w-full max-w-2xl px-4 z-10">
                    <div className="flex items-center gap-4 mb-8">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <Skeleton className="h-8 w-48 rounded-lg" />
                    </div>
                    {/* 탭 스켈레톤 */}
                    <Skeleton className="h-14 w-full rounded-2xl mb-10" />

                    {/* 카드 스켈레톤 */}
                    <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-white dark:border-white/10 rounded-[40px] p-8 md:p-10 shadow-sm space-y-10">
                        <div className="flex flex-col items-center space-y-4">
                            <Skeleton className="w-32 h-32 rounded-full" />
                            <Skeleton className="h-4 w-32 rounded" />
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <Skeleton className="h-5 w-20 rounded" />
                                <Skeleton className="h-14 w-full rounded-xl" />
                            </div>
                            <div className="space-y-3">
                                <Skeleton className="h-5 w-20 rounded" />
                                <div className="grid grid-cols-2 gap-4">
                                    <Skeleton className="h-14 w-full rounded-xl" />
                                    <Skeleton className="h-14 w-full rounded-xl" />
                                </div>
                            </div>
                            <Skeleton className="h-14 w-full rounded-2xl mt-8" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDF2F8] dark:bg-gray-950 flex flex-col items-center py-10 md:py-20 font-['Pretendard'] relative overflow-x-hidden">
            {/* 배경 장식 */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-200/30 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200/30 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-2xl px-4 z-10">
                <div className="flex items-center gap-6 mb-12">
                    <button
                        onClick={() => navigate('/mypage')}
                        className="p-3 bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 rounded-2xl transition-all shadow-sm border border-white/50 dark:border-white/10"
                    >
                        <ChevronLeft size={24} className="text-[#1A1F36] dark:text-white" />
                    </button>
                    <h1 className="text-3xl font-black text-[#1A1F36] dark:text-white tracking-tight">프로필 상세 수정</h1>
                </div>

                {/* 프리미엄 탭 메뉴 */}
                <div className="flex bg-white/40 dark:bg-white/5 backdrop-blur-xl p-1.5 rounded-[28px] mb-12 border border-white/60 dark:border-white/10 shadow-lg shadow-pink-100/10">
                    <button
                        onClick={() => setActiveTab('basic')}
                        className={`flex-1 py-4 rounded-[22px] font-black transition-all duration-500 relative overflow-hidden group ${activeTab === 'basic'
                            ? 'bg-white dark:bg-gray-800 text-[#FF4D94] shadow-md scale-[1.02]'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                            }`}
                    >
                        {activeTab === 'basic' && (
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-50/50 to-transparent pointer-events-none" />
                        )}
                        기본 정보
                    </button>
                    <button
                        onClick={() => setActiveTab('verification')}
                        className={`flex-1 py-4 rounded-[22px] font-black transition-all duration-500 relative overflow-hidden group ${activeTab === 'verification'
                            ? 'bg-white dark:bg-gray-800 text-[#FF4D94] shadow-md scale-[1.02]'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                            }`}
                    >
                        {activeTab === 'verification' && (
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-50/50 to-transparent pointer-events-none" />
                        )}
                        본인 인증
                    </button>
                </div>

                <div className="w-full transition-all duration-500 transform animate-in fade-in slide-in-from-bottom-4">
                    {activeTab === 'basic' ? (
                        <BasicInfoForm initialData={basicInfo} onNext={handleUpdateBasic} hideHeader />
                    ) : (
                        <div className="relative w-full bg-white/90 dark:bg-black/40 backdrop-blur-3xl rounded-[60px] p-8 md:p-16 shadow-2xl border border-white dark:border-white/10 flex flex-col items-center">
                            <PhotoVerification
                                initialFile={null}
                                initialPreview={verifyPreview}
                                onNext={handleUpdateVerification}
                                onBack={() => setActiveTab('basic')}
                                hideHeader
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
