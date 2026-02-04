import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import MessageList from '@/components/message/MessageList';
import { getChatRooms } from '@/api/match';

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
            opponentName: `사용자 ${room.opponentId}`,
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
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#FF4D94] border-t-transparent rounded-full animate-spin" />
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