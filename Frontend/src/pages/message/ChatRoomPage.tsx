import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, Image as ImageIcon, Smile, LogOut } from 'lucide-react';
import defaultProfile from '@/assets/default-profile.png';
import { leaveChatRoom, sendMessage, getChatMessages } from '@/api/match';
import { getMyInfo } from '@/api/user';

interface Message {
  id: number;
  senderId: number;
  content: string;
  time: string;
  isMine: boolean;
}

export default function ChatRoomPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [myId, setMyId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<number | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  const emojiGroups = [
    { label: '웃음', emojis: ['�', '😃', '😄', '😁', '😅', '😂', '🤣', '�😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '�', '�', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'] },
    { label: '손 & 몸', emojis: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '�👍', '�', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '�🙏', '✍️', '�', '🤳', '💪', '🦾'] },
    { label: '하트 & 감정', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '�💖', '�', '💝', '�', '�', '💢', '💤', '💥', '💫', '💦', '💨'] },
    { label: '자연 & 장식', emojis: ['✨', '🌟', '⭐', '🔥', '🌈', '☁️', '☀️', '🌸', '🌹', '🌺', '🌻', '🌼', '🌷', '🌱', '🌿', '☘️', '🍀', '🍃', '🌍', '🌎', '🌏', '🌕', '🌙', '☄️', '☃️', '⛄', '❄️', '�', '🎉', '🎊', '🎈', '🎁'] }
  ];

  const opponent = {
    name: '상대방', // TODO: 상세 정보 API 연동 시 이름 업데이트
    status: '온라인',
  };

  // 초기 데이터 로딩 및 폴링 설정
  useEffect(() => {
    let pollingInterval: any;

    const initChatRoom = async () => {
      if (!matchId) return;

      try {
        setLoading(true);
        // 1. 내 정보 가져오기 (isMine 판단용)
        const user: any = await getMyInfo();
        let currentUserId = 0;
        if (user) {
          setMyId(user.id);
          currentUserId = user.id;
        }

        // 2. 초기 대화 내역 가져오기
        const history: any = await getChatMessages(matchId);
        if (history && history.length > 0) {
          const mappedMessages = history.map((msg: any) => ({
            id: msg.id,
            senderId: msg.senderId,
            content: msg.content,
            time: formatTime(msg.createdAt),
            isMine: msg.senderId === currentUserId
          }));
          setMessages(mappedMessages);

          // 마지막 메시지 ID 저장
          const maxId = Math.max(...history.map((m: any) => m.id));
          lastMessageIdRef.current = maxId;
        }

        // 3. 폴링 시작 (3초마다 새 메시지 확인)
        pollingInterval = setInterval(fetchNewMessages, 3000);

      } catch (error) {
        console.error('❌ [ChatRoomPage] 초기화 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchNewMessages = async () => {
      if (!matchId || !lastMessageIdRef.current) return;

      try {
        const newData: any = await getChatMessages(matchId, 50, lastMessageIdRef.current);
        if (newData && newData.length > 0) {
          console.log('📨 실시간 새 메시지 도착:', newData);

          const newMapped = newData.map((msg: any) => ({
            id: msg.id,
            senderId: msg.senderId,
            content: msg.content,
            time: formatTime(msg.createdAt),
            isMine: msg.senderId === myId
          }));

          setMessages((prev) => {
            const existingIds = new Set(prev.map(m => m.id));
            const filteredNew = newMapped.filter((m: any) => !existingIds.has(m.id));
            return [...prev, ...filteredNew];
          });

          const maxId = Math.max(...newData.map((m: any) => m.id));
          lastMessageIdRef.current = Math.max(lastMessageIdRef.current, maxId);
        }
      } catch (error) {
        console.error('❌ [ChatRoomPage] 폴링 실패:', error);
      }
    };

    initChatRoom();

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [matchId, myId]);

  // 시간 포맷팅 유틸
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // 외부 클릭 시 이모지 선택기 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // 메시지 전송 핸들러
  const handleSend = async () => {
    if (!inputText.trim() || !matchId) return;

    try {
      const response: any = await sendMessage(matchId, inputText);

      if (response) {
        // 서버 응답 데이터를 기반으로 메시지 추가
        const newMessage: Message = {
          id: response.id,
          senderId: response.senderId,
          content: response.content,
          time: new Date(response.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }),
          isMine: true // 내가 보낸 것이 확실하므로 true
        };

        setMessages((prev) => [...prev, newMessage]);
        setInputText('');
        setShowEmojiPicker(false);

        // 보낸 메시지 ID가 현재 추적 중인 ID보다 크면 업데이트
        if (response.id && (!lastMessageIdRef.current || response.id > lastMessageIdRef.current)) {
          lastMessageIdRef.current = response.id;
        }
      }
    } catch (error: any) {
      console.error('❌ [ChatRoomPage] 메시지 전송 실패:', error);
      alert(error.message || '메시지 전송에 실패했습니다.');
    }
  };

  // 쪽지방 나가기 핸들러
  const handleLeave = async () => {
    if (!matchId) return;

    if (window.confirm('정말 이 대화방에서 나가시겠습니까? \n나간 후에는 다시 메시지를 보낼 수 없습니다.')) {
      try {
        const response: any = await leaveChatRoom(matchId);
        if (response) {
          alert('대화방에서 나갔습니다.');
          navigate('/messages');
        }
      } catch (error) {
        console.error('❌ [ChatRoomPage] 나가기 실패:', error);
        alert('나가기에 실패했습니다. 다시 시도해 주세요.');
      }
    }
  };

  // 스크롤 하단 고정
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="h-full flex flex-col bg-[#F8F9FD] dark:bg-[#0F1117] font-['Pretendard']">

      {/* 1. 상단 정보 바 */}
      <header className="h-20 flex items-center justify-between px-6 bg-white/80 dark:bg-black/40 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 z-20 transition-colors">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/messages')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={defaultProfile} alt="profile" className="w-10 h-10 rounded-full border border-gray-100" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <h2 className="font-black text-[#1A1F36] dark:text-white text-lg tracking-tight">{opponent.name}</h2>
              <p className="text-[11px] text-[#FF4D94] font-bold uppercase tracking-wider">{opponent.status}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLeave}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all active:scale-95"
          title="대화방 나가기"
        >
          <LogOut size={20} />
          <span className="hidden md:inline">나가기</span>
        </button>
      </header>

      {/* 2. 메시지 영역 */}
      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6 no-scrollbar"
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-[#FF4D94] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-gray-400">대화 내역을 불러오는 중...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
            <p className="text-sm font-bold">아직 메시지가 없습니다.</p>
            <p className="text-xs">상대방에게 첫 인사를 건네보세요! ✨</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              {!msg.isMine && (
                <img src={defaultProfile} alt="p" className="w-8 h-8 rounded-full mr-3 mt-1 self-start" />
              )}
              <div className={`max-w-[70%] flex flex-col ${msg.isMine ? 'items-end' : 'items-start'}`}>
                <div className={`
                  px-5 py-3 rounded-[24px] text-[15px] font-medium leading-relaxed shadow-sm
                  ${msg.isMine
                    ? 'bg-gradient-to-tr from-[#FF4D94] to-[#7C3AED] text-white rounded-tr-none shadow-pink-100'
                    : 'bg-white dark:bg-white/10 text-[#1A1F36] dark:text-gray-200 rounded-tl-none border border-gray-50 dark:border-white/5'}
                `}>
                  {msg.content}
                </div>
                <span className="text-[10px] text-gray-400 mt-2 font-bold px-1">{msg.time}</span>
              </div>
            </div>
          ))
        )}
      </main>

      <footer className="p-6 pt-2 bg-transparent relative">
        {/* 고도화된 이모지 선택기 팝오버 */}
        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            className="absolute bottom-24 left-6 right-6 md:left-10 md:right-auto bg-white/95 dark:bg-[#1A1F36]/95 backdrop-blur-2xl border border-gray-100 dark:border-white/10 rounded-[32px] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-auto max-w-[calc(100%-48px)] md:w-80 h-96 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300 z-30"
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-sm font-black text-[#1A1F36] dark:text-white">이모지 선택</span>
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-white uppercase tracking-widest"
              >
                닫기
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar space-y-6">
              {emojiGroups.map((group) => (
                <div key={group.label}>
                  <h4 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 mb-3 px-1 uppercase tracking-wider">{group.label}</h4>
                  <div className="grid grid-cols-6 md:grid-cols-7 gap-1">
                    {group.emojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setInputText((prev) => prev + emoji)}
                        className="w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all hover:scale-125 active:scale-90"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex justify-center">
              <div className="w-10 h-1 bg-gray-200 dark:bg-white/10 rounded-full" />
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-black/40 backdrop-blur-xl border border-white dark:border-white/10 rounded-[32px] p-2 flex items-center gap-2 shadow-xl shadow-gray-200/50 dark:shadow-none transition-all focus-within:ring-2 ring-[#FF4D94]/20">
          <button
            ref={emojiButtonRef}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-3 transition-colors ${showEmojiPicker ? 'text-[#FF4D94]' : 'text-gray-400 hover:text-[#FF4D94]'}`}
          >
            <Smile size={22} />
          </button>

          <input
            type="text"
            placeholder="따뜻한 한마디를 건네보세요..."
            className="flex-1 bg-transparent border-none outline-none px-4 text-[15px] font-medium text-[#1A1F36] dark:text-white placeholder:text-gray-400"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
              if (e.key === 'Escape') setShowEmojiPicker(false);
            }}
            onFocus={() => setShowEmojiPicker(false)}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="w-12 h-12 bg-gradient-to-tr from-[#FF4D94] to-[#7C3AED] text-white rounded-full flex items-center justify-center shadow-lg shadow-pink-200 dark:shadow-none hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all"
          >
            <Send size={20} fill="white" />
          </button>
        </div>
      </footer>
    </div>
  );
}