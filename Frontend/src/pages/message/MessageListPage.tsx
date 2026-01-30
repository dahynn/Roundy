import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Bell } from 'lucide-react';
import Header from '@/components/layout/Header'; // Header도 공통 컴포넌트 사용 권장

export default function MessageListPage() {
  const navigate = useNavigate();
  const [chatRooms, setChatRooms] = useState<any[]>([]);

  useEffect(() => {
    const mockRooms = [
      { id: 1, opponentName: '민수', lastMessageContent: '대화방이 열렸습니다', hasNew: true },
      { id: 2, opponentName: '지혜', lastMessageContent: '대화방이 열렸습니다', hasNew: false },
    ];
    setChatRooms(mockRooms);
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* HomePage와 동일한 Header 사용 */}
      <Header />

      <main className="flex-1 overflow-hidden p-8 md:p-12 flex flex-col items-center">
        <div className="w-full max-w-[1400px] h-full flex flex-col">
          <h1 className="text-4xl font-black text-[#1A1F36] mb-2 tracking-tight">쪽지함</h1>
          <p className="text-[#697386] font-medium mb-12 text-lg">
            새로운 소통의 시작, 받은 쪽지 리스트입니다.
          </p>

          {/* 리스트 영역이 화면에 꽉 차도록 flex-1 적용 */}
          <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-[40px] p-10 shadow-2xl shadow-pink-100/10 border border-white overflow-y-auto">
            <div className="flex flex-col gap-6">
              {chatRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => navigate(`/messages/${room.id}`)}
                  className="flex items-center p-8 rounded-[32px] hover:bg-white transition-all cursor-pointer group shadow-sm hover:shadow-lg border border-transparent hover:border-pink-100"
                >
                  <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden mr-8 border-2 border-white shrink-0">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${room.opponentName}`}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-[#1A1F36] text-xl">{room.opponentName}</span>
                      {room.hasNew && (
                        <span className="bg-[#FF4D94] text-white text-[10px] px-2.5 py-1 rounded-full font-black">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="bg-gray-100/70 px-6 py-4 rounded-2xl inline-block">
                      <p className="text-[#1A1F36] font-bold text-2xl truncate">
                        {room.lastMessageContent}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
