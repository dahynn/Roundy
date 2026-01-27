package com.ssafya701.roundy.match.service;

import com.ssafya701.roundy.chatmessage.entity.ChatMessage;
import com.ssafya701.roundy.chatmessage.enums.MsgType;
import com.ssafya701.roundy.chatmessage.repository.ChatMessageRepository;
import com.ssafya701.roundy.global.error.BusinessLogicException;
import com.ssafya701.roundy.match.dto.MatchDto;
import com.ssafya701.roundy.match.entity.Match;
import com.ssafya701.roundy.match.repository.MatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MatchService {

    private final MatchRepository matchRepository;
    private final ChatMessageRepository chatMessageRepository;

    /**
     * 사용자의 활성화된 쪽지방 목록을 조회
     * @param userId 현재 로그인한 사용자 ID
     * @return 최신 메시지 순으로 정렬된 매칭 응답 DTO 리스트
     */
    public List<MatchDto.Response> getMyMatches(Long userId) {
        return matchRepository.findMyMatches(userId).stream()
                .map(match -> MatchDto.Response.from(match, userId))
                .collect(Collectors.toList());
    }

    /**
     * 매칭 PK로 특정 매칭 정보를 조회
     * @param matchId 조회할 매칭 ID
     * @return 매칭 엔티티
     * @throws BusinessLogicException 해당 ID의 매칭이 존재하지 않을 경우 발생
     */
    public Match getMatchById(Long matchId) {
        return matchRepository.findById(matchId)
                .orElseThrow(() -> new BusinessLogicException("존재하지 않는 쪽지방입니다."));
    }

    /**
     * 쪽지방 나가기
     * 1. 나간 시간 기록 및 방 상태 TERMINATED 변경
     * 2. 시스템 메시지 전송 ("상대방이 나가서...")
     * 3. 양쪽 모두 나갔는지 확인 후 Soft Delete 처리
     */
    @Transactional
    public MatchDto.LeaveResponse leaveMatch(Long matchId, Long userId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new BusinessLogicException("존재하지 않는 쪽지방입니다."));

        // 상태 변경 (이탈 처리)
        match.terminateChat(userId);

        /**
         * 양쪽 모두 나간 경우
         * */
        // 양쪽 모두 나갔는지 확인
        if (match.getMaleLeftAt() != null && match.getFemaleLeftAt() != null) {

            // 연관된 메시지 데이터 영구 삭제
            chatMessageRepository.deleteAllByMatchId(matchId);

            // 매칭 데이터 영구 삭제
            matchRepository.delete(match);

            //
            return MatchDto.LeaveResponse.from(match);
        }

        /**
         * 한 명만 나간 경우
         * */
        // 시스템 메시지 생성 (상대방에게 알림)
        Long receiverId = match.getMaleId().equals(userId) ? match.getFemaleId() : match.getMaleId();

        ChatMessage systemMessage = ChatMessage.builder()
                .matchId(matchId)
                .senderId(userId)
                .receiverId(receiverId)
                .content("상대방이 대화를 종료하여 채팅방이 닫혔습니다.")
                .msgType(MsgType.SYSTEM)
                .build();

        chatMessageRepository.save(systemMessage);

        // 마지막 메시지 업데이트 (목록에서 "대화 종료" 확인용)
        match.updateLastMessage(systemMessage.getContent(), systemMessage.getCreatedAt());

        return MatchDto.LeaveResponse.from(match);
    }

}
