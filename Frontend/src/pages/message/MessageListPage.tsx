import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
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
      },
      {
        id: 2,
        opponentName: '하이잉',
        lastMessageContent: '대화방이 열렸습니다',
        hasNew: false,
      },
    ];
    setChatRooms(mockRooms);
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#FAFBFF]">
      <Header />

      <main className="flex-1 overflow-hidden p-6 md:p-10 flex flex-col items-center">
        <div className="w-full max-w-[1200px] h-full flex flex-col">
          {/* 타이틀 영역 간격 축소 */}
          <div className="mb-8 ml-2">
            <h1 className="text-3xl font-black text-[#1A1F36] mb-2 tracking-tight">쪽지함</h1>
            <p className="text-[#697386] font-medium text-base">
              새로운 소통의 시작, 받은 쪽지 리스트입니다.
            </p>
          </div>

          {/* 리스트 컨테이너 패딩 조정 */}
          <div className="flex-1 bg-white/60 backdrop-blur-xl rounded-[40px] p-6 shadow-2xl shadow-gray-200/40 border border-white overflow-y-auto custom-scrollbar">
            <div className="flex flex-col gap-4">
              {chatRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => navigate(`/messages/${room.id}`)}
                  className="flex items-center p-5 rounded-[28px] bg-white border border-gray-50 shadow-sm hover:shadow-md hover:border-pink-100 transition-all cursor-pointer group"
                >
                  {/* 1. 프로필 이미지 크기 축소 (w-24 -> w-16) */}
                  <div className="w-16 h-16 rounded-full bg-[#E9ECEF] overflow-hidden mr-6 border-2 border-white shadow-sm shrink-0 flex items-center justify-center">
                    <img
                      src={defaultProfile}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* 2. 이름 및 뱃지 간격/사이즈 조정 */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-black text-[#1A1F36] text-lg tracking-tight">
                        {room.opponentName}
                      </span>
                      {room.hasNew && (
                        <span className="bg-[#FF4D94] text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase">
                          NEW
                        </span>
                      )}
                    </div>

                    {/* 3. 말풍선 텍스트 슬림화 (text-2xl -> text-base, py-5 -> py-2.5) */}
                    <div className="bg-[#F1F3F5] px-5 py-2.5 rounded-[18px] inline-block group-hover:bg-pink-50 transition-colors">
                      <p className="text-[#1A1F36] font-bold text-base truncate tracking-tight">
                        {room.lastMessageContent}
                      </p>
                    </div>
                  </div>

                  {/* 4. 우측 화살표 아이콘 추가 (가이드 제공) */}
                  <div className="ml-4 text-gray-300 group-hover:text-[#FF4D94] transition-colors">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
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
