import client from './_client';

/**
 * 쪽지방 목록 조회
 */
export const getChatRooms = () => client.get('/matches');

/**
 * 쪽지 전송
 */
export const sendMessage = (matchId: number | string, content: string) =>
    client.post(`/matches/${matchId}/messages`, { content });

/**
 * 쪽지방 나가기
 */
export const leaveChatRoom = (id: number | string) => client.post(`/matches/${id}/leave`);

/**
 * 대화 내역 조회 (lastMessageId가 있으면 해당 ID 이후의 메시지만 가져옴)
 */
export const getChatMessages = (matchId: number | string, size: number = 50, lastMessageId?: number | null) => {
    let url = `/matches/${matchId}/messages?size=${size}`;
    if (lastMessageId) {
        url += `&lastMessageId=${lastMessageId}`;
    }
    return client.get(url);
};

/**
 * 매칭 대기열 입장 (Polling용)
 */
export const enterMatchingQueue = () => {
    return client.post('/session/enter');
};
