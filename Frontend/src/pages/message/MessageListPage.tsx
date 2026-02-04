import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import MessageList from '@/components/message/MessageList';
import { getChatRooms } from '@/api/match';
import { Skeleton } from '@/components/ui/skeleton';

export default function MessageListPage() {
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
        setLoading(true);
        const data = await getChatRooms() as any;
        console.log('📡 [MessageListPage] 쪽지함 목록:', data);

        if (data) {
          const mappedRooms = data.map((room: any) => ({
            id: room.id,
            opponentName: room.nickname || `사용자 ${room.opponentId}`,
            profileImgUrl: room.profileImgUrl,
            lastMessageContent: room.lastMessageContent || '대화방이 열렸습니다',
            hasNew: room.unreadCount > 0,
            time: room.lastMessageAt ? formatRelativeTimeCode(room.lastMessageAt) : '방금 전',
            unreadCount: room.unreadCount,
            chatStatus: room.chatStatus
          }));
          setChatRooms(mappedRooms);
        }
      } catch (error) {
        console.error('❌ [MessageListPage] 쪽지함 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchChatRooms();
  }, []);

  // 간단한 시간 포맷팅 유틸 (서버의 ISO string 대응)
  const formatRelativeTimeCode = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${diffDays}일 전`;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden font-['Pretendard']">
      <Header />

      <main className="flex-1 overflow-hidden p-6 md:p-10 flex flex-col items-center">
        <div className="w-full max-w-3xl h-full flex flex-col">

          {/* 타이틀 영역 */}
          <div className="mb-8 px-2">
            <h1 className="text-3xl font-black text-[#1A1F36] dark:text-white mb-2 tracking-tight flex items-center gap-2 transition-colors">
              Message
              <span className="w-2 h-2 bg-[#FF4D94] rounded-full animate-pulse" />
            </h1>
            <p className="text-[#697386] dark:text-gray-400 font-medium text-base transition-colors">
              새로운 소통의 시작, 받은 쪽지 리스트입니다.
            </p>
          </div>

          {/* 리스트 컨테이너 (아이폰 글라스 효과 적용) */}
          <div className="flex-1 bg-white/40 dark:bg-black/40 backdrop-blur-2xl backdrop-saturate-150 rounded-[40px] p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-white/50 dark:border-white/5 overflow-y-auto overflow-x-hidden no-scrollbar relative transition-colors duration-300">

            {/* 장식용 배경 글로우 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-pink-100/40 dark:from-pink-900/10 to-transparent rounded-full -mr-10 -mt-10 pointer-events-none" />

            {loading ? (
              <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-2">
                    <Skeleton className="w-14 h-14 rounded-full shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-5 w-24 rounded-lg" />
                        <Skeleton className="h-4 w-12 rounded-md" />
                      </div>
                      <Skeleton className="h-4 w-full max-w-[200px] rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <MessageList chatRooms={chatRooms} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}