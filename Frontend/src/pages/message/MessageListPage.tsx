import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { ChevronRight, MessageCircle } from 'lucide-react';
import defaultProfile from '../../assets/default-profile.png';

export default function MessageListPage() {
  const navigate = useNavigate();
  const [chatRooms, setChatRooms] = useState<any[]>([]);

  useEffect(() => {
    const mockRooms = [
      {
        id: 1,
        opponentName: '하요오오옹',
        lastMessageContent: '대화방이 열렸습니다',
        hasNew: true,
        time: '방금 전',
      },
      {
        id: 2,
        opponentName: '하이잉',
        lastMessageContent: '안녕하세요! 반갑습니다 ㅎㅎ',
        hasNew: false,
        time: '1시간 전',
      },
    ];
    setChatRooms(mockRooms);
  }, []);

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
          <div className="flex-1 bg-white/40 dark:bg-black/40 backdrop-blur-2xl backdrop-saturate-150 rounded-[40px] p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-white/50 dark:border-white/5 overflow-y-auto no-scrollbar relative transition-colors duration-300">
            
            {/* 장식용 배경 글로우 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-pink-100/40 dark:from-pink-900/10 to-transparent rounded-full -mr-10 -mt-10 pointer-events-none" />

            {chatRooms.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                  <MessageCircle size={32} className="opacity-20" />
                </div>
                <p>아직 주고받은 쪽지가 없어요.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 relative z-10">
                {chatRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => navigate(`/messages/${room.id}`)}
                    className="group relative flex items-center p-5 rounded-[28px] bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-white dark:border-white/5 shadow-sm hover:shadow-[0_8px_24px_rgba(255,77,148,0.15)] hover:border-pink-100 dark:hover:border-pink-500/30 transition-all duration-300 cursor-pointer hover:-translate-y-1"
                  >
                    {/* 1. 프로필 이미지 (그라데이션 링) */}
                    <div className="relative mr-6 shrink-0">
                      <div className={`w-[68px] h-[68px] rounded-full p-[2px] ${room.hasNew ? 'bg-gradient-to-tr from-[#FF4D94] to-[#7C3AED]' : 'bg-gray-100 dark:bg-gray-700'}`}>
                        <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 p-[2px]">
                          <img
                            src={defaultProfile}
                            alt="Profile"
                            className="w-full h-full object-cover rounded-full"
                          />
                        </div>
                      </div>
                      {/* NEW 뱃지 (프로필 우측 하단) */}
                      {room.hasNew && (
                        <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#FF4D94] border-[3px] border-white rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 py-1">
                      {/* 2. 이름 및 시간 */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[#1A1F36] dark:text-white text-lg tracking-tight group-hover:text-[#FF4D94] dark:group-hover:text-[#FF4D94] transition-colors">
                            {room.opponentName}
                          </span>
                          {room.hasNew && (
                            <span className="bg-gradient-to-r from-[#FF4D94] to-[#F43F5E] text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm shadow-pink-200 dark:shadow-none">
                              NEW
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                          {room.time || '방금 전'}
                        </span>
                      </div>

                      {/* 3. 말풍선 내용 */}
                      <p className={`text-base truncate tracking-tight transition-colors ${room.hasNew ? 'text-[#1A1F36] dark:text-gray-200 font-bold' : 'text-[#697386] dark:text-gray-400 font-medium'}`}>
                        {room.lastMessageContent}
                      </p>
                    </div>

                    {/* 4. 우측 화살표 (호버 시 이동 애니메이션) */}
                    <div className="ml-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-white/10 text-gray-300 dark:text-gray-500 group-hover:bg-[#FF4D94] dark:group-hover:bg-[#FF4D94] group-hover:text-white transition-all duration-300 group-hover:translate-x-1">
                      <ChevronRight size={18} strokeWidth={3} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}