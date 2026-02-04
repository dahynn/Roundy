import { MessageCircle } from 'lucide-react';
import MessageCard from './MessageCard';
import { useNavigate } from 'react-router-dom';

interface ChatRoom {
    id: number;
    opponentName: string;
    profileImgUrl: string;
    lastMessageContent: string;
    hasNew: boolean;
    time: string;
}

interface MessageListProps {
    chatRooms: ChatRoom[];
}

export default function MessageList({ chatRooms }: MessageListProps) {
    const navigate = useNavigate();

    if (chatRooms.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                    <MessageCircle size={32} className="opacity-20" />
                </div>
                <p>아직 주고받은 쪽지가 없어요.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 relative z-10">
            {chatRooms.map((room) => (
                <MessageCard
                    key={room.id}
                    {...room}
                    onClick={() => navigate(`/messages/${room.id}`)}
                />
            ))}
        </div>
    );
}
