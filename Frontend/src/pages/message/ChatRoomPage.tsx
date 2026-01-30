import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, MoreVertical, Plus, Smile, Send } from 'lucide-react';

export default function ChatRoomPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. 대화 내역 조회
  useEffect(() => {
    const mockMessages = [
      {
        id: 1,
        senderId: 101,
        content: '안녕하세요! 쪽지 수락해주셔서 감사해요. 프로필 사진이 너무 인상적이었어요 :)',
        createdAt: '오후 2:15',
      },
      {
        id: 2,
        senderId: 1,
        content:
          '안녕하세요 민수님! 저도 반가워요. 쪽지 내용이 너무 진심 어린 게 느껴져서 저도 모르게 수락 버튼을 눌렀네요 ㅎㅎ',
        createdAt: '오후 2:18',
      },
      {
        id: 3,
        senderId: 101,
        content:
          '좋게 봐주셔서 다행이에요! 혹시 주말에 주로 뭐 하시는 편인가요? 저는 카페 투어 다니는 걸 좋아해요.',
        createdAt: '오후 2:20',
      },
    ];
    setMessages(mockMessages);
  }, [matchId]);

  // 2. 쪽지 전송
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    const newMessage = {
      id: Date.now(),
      senderId: 1, // 본인
      content: inputValue,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([...messages, newMessage]);
    setInputValue('');
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-['Pretendard']">
      {/* 채팅 헤더 */}
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <ChevronLeft onClick={() => navigate(-1)} className="cursor-pointer text-gray-400" />
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=민수" alt="Avatar" />
          </div>
          <span className="font-bold text-lg text-[#1A1F36]">민수</span>
        </div>
        <MoreVertical className="text-gray-300 cursor-pointer" />
      </header>

      {/* 채팅 본문 영역 */}
      <div className="flex-1 overflow-y-auto p-12 space-y-8 flex flex-col">
        <div className="text-center text-xs text-gray-300 font-bold mb-8 uppercase tracking-widest">
          2024년 5월 24일
        </div>

        {messages.map((msg) => {
          const isMine = msg.senderId === 1;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'} items-end gap-3`}
            >
              {!isMine && (
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0 self-start">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=민수" alt="Avatar" />
                </div>
              )}
              <div className="flex flex-col gap-1 max-w-[60%]">
                <div
                  className={`px-6 py-4 rounded-[25px] text-[15px] leading-relaxed shadow-sm ${
                    isMine
                      ? 'bg-[#FF4D94] text-white rounded-br-none'
                      : 'bg-white text-[#1A1F36] rounded-bl-none border border-gray-50'
                  }`}
                >
                  {msg.content}
                </div>
                <span
                  className={`text-[10px] font-bold text-gray-300 ${isMine ? 'text-right' : 'text-left'}`}
                >
                  {msg.createdAt}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* 푸터 입력창 */}
      <div className="p-8 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto relative flex items-center gap-4 bg-gray-50 rounded-full px-6 py-3 border border-gray-100">
          <Plus className="text-gray-300 cursor-pointer" />
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="메시지를 입력하세요..."
            className="flex-1 bg-transparent focus:outline-none text-sm font-medium"
          />
          <Smile className="text-gray-300 cursor-pointer" />
          <button
            onClick={handleSendMessage}
            className="w-10 h-10 bg-[#FF4D94] rounded-full flex items-center justify-center text-white shadow-lg shadow-pink-200 hover:scale-105 active:scale-95 transition-all"
          >
            <Send size={18} fill="white" />
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-200 font-bold mt-6 tracking-widest uppercase">
          © 2024 Roundy Premium. All rights reserved.
        </p>
      </div>
    </div>
  );
}
