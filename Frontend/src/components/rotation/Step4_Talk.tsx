import { Publisher, StreamManager } from 'openvidu-browser';
import UserVideo from '../meeting/UserVideo'; // Import UserVideo component

interface TalkProps {
  partner: {
    name: string;
    id: number;
    // Add other partner properties as needed
  };
  currentUser: {
    username: string;
    // Add other user properties as needed
  };
  showCards?: boolean; // New prop to toggle card display (e.g., true for Long Talk)
  publisher?: Publisher;
  subscribers?: StreamManager[];
}

const TALK_CARDS = [
  "가장 기억에 남는 여행지는 어디인가요?",
  "휴일에는 주로 무엇을 하며 시간을 보내시나요?",
  "좋아하는 영화 장르는 무엇인가요?",
  "최근에 가장 맛있게 먹은 음식은?",
  "나만의 스트레스 해소법이 있다면?",
  "살면서 꼭 한번 도전해보고 싶은 것은?",
];

export const Step4_Talk = ({ partner, currentUser, showCards = false, publisher, subscribers }: TalkProps) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Find partner's stream
  // Assuming subscriber's clientData contains nickname or username matching partner.name
  const partnerStream = subscribers?.find(sub => {
    try {
      const data = JSON.parse(sub.stream.connection.data).clientData;
      return data === partner.name;
    } catch (e) {
      return false;
    }
  });

  const handleNextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev + 1) % TALK_CARDS.length);
    }, 200); // Wait for flip back
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="w-full max-w-[1400px] h-full relative animate-in fade-in duration-1000">

      {/* Main Grid: 2 Video Feeds */}
      <div className="w-full h-full grid grid-cols-2 gap-4">

        {/* Left: YOU (Blurred/Restricted View - "하관만 공개") */}
        <div className="relative rounded-[32px] overflow-hidden bg-gray-900 border border-white/10 shadow-2xl group">
          {publisher ? (
            <UserVideo streamManager={publisher} isLocal={true} />
          ) : (
            /* Fallback/Loading */
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-center">
              <div className="text-center opacity-40">
                <User size={80} className="mb-4 mx-auto" />
                <p className="text-xl font-bold text-white">카메라 연결 중...</p>
              </div>
            </div>
          )}
          {/* 하관만 공개 효과 (블러 오버레이 등)는 CSS로 추가 가능 */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-black/50 backdrop-blur-md z-10 flex items-center justify-center">
            <p className="text-white/70 font-bold text-xl">눈/코 블러 처리 (예시)</p>
          </div>

          {/* Name Tag */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white font-bold text-lg drop-shadow-md z-20">
            {currentUser?.username} (나)
          </div>
        </div>

        {/* Right: PARTNER (Blurred/Restricted View - "하관만 공개") */}
        <div className="relative rounded-[32px] overflow-hidden bg-gray-900 border border-white/10 shadow-2xl">
          {partnerStream ? (
            <UserVideo streamManager={partnerStream} />
          ) : (
            /* Fallback/Loading */
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-center">
              <div className="text-center opacity-40">
                <User size={80} className="mb-4 mx-auto" />
                <p className="text-xl font-bold text-white">상대방 연결 대기 중...</p>
              </div>
            </div>
          )}
          {/* 하관만 공개 효과 */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-black/50 backdrop-blur-md z-10 flex items-center justify-center">
            <p className="text-white/70 font-bold text-xl">눈/코 블러 처리 (예시)</p>
          </div>

          {/* Name Tag */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white font-bold text-lg drop-shadow-md z-20">
            {partner?.name}
          </div>
        </div>

      </div>

      {/* Floating Center Card (Only shown if showCards is true) */}
      {showCards && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 perspective-1000">
          <div
            className={`relative w-[280px] h-[400px] transition-all duration-500 transform-style-3d cursor-pointer group ${isFlipped ? 'rotate-y-180' : ''}`}
            onClick={handleFlip}
          >
            {/* Front Side (Label) */}
            <div className="absolute inset-0 backface-hidden">
              <div className="w-full h-full bg-[#1A1A1A]/90 backdrop-blur-xl border border-[#FF4D94]/30 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center p-6 text-center hover:border-[#FF4D94] transition-colors">
                <div className="w-16 h-16 bg-[#FF4D94]/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-[#FF4D94]/30 group-hover:scale-110 transition-transform">
                  <MessageCircle className="text-[#FF4D94]" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">대화 카드</h3>
                <p className="text-sm text-white/50 mb-8">클릭하여 뒤집어보세요</p>
                <button className="px-6 py-2 bg-[#FF4D94] rounded-full text-white text-xs font-bold hover:bg-[#ff3385] transition-colors">
                  뒤집기
                </button>
              </div>
            </div>

            {/* Back Side (Content) */}
            <div className="absolute inset-0 backface-hidden rotate-y-180">
              <div className="w-full h-full bg-gradient-to-br from-[#FF4D94] to-[#ff1a75] rounded-[24px] shadow-[0_20px_50px_rgba(255,77,148,0.3)] flex flex-col items-center justify-center p-8 text-center relative border border-white/20">
                <div className="absolute top-4 right-4 text-white/40 font-black text-4xl opacity-20">"</div>
                <h3 className="text-xl font-bold text-white leading-relaxed drop-shadow-sm">
                  {TALK_CARDS[currentCardIndex]}
                </h3>
                <div className="absolute bottom-4 right-8 text-white/40 font-black text-4xl opacity-20 rotate-180">"</div>

                {/* Refresh Button - Only on back */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleNextCard(); }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 p-3 bg-black/20 hover:bg-black/30 rounded-full text-white backdrop-blur-sm transition-all hover:rotate-180"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
