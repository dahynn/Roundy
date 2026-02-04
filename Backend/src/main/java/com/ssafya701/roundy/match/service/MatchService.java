package com.ssafya701.roundy.match.service;

import com.ssafya701.roundy.chatmessage.entity.ChatMessage;
import com.ssafya701.roundy.chatmessage.enums.MsgType;
import com.ssafya701.roundy.chatmessage.repository.ChatMessageRepository;
import com.ssafya701.roundy.global.error.BusinessLogicException;
import com.ssafya701.roundy.global.error.CustomException;
import com.ssafya701.roundy.global.error.ErrorEnum;
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
    private final com.ssafya701.roundy.auth.repository.UserRepository userRepository;

    /**
     * 새로운 매칭 생성 및 저장
     * 
     * @param roomId   세션 ID (방 ID)
     * @param maleId   남성 사용자 ID
     * @param femaleId 여성 사용자 ID
     * @return 생성된 매칭 정보
     */
    @Transactional
    public Match createMatch(String roomId, Long maleId, Long femaleId) {
        // roomId에서 숫자만 추출하거나 해싱하여 Long 타입 session_id 생성 (임시)
        // 실제로는 roomId(String)를 저장하도록 Entity 수정이 필요할 수 있으나,
        // 현재 Entity가 Long sessionId를 요구하므로 해시코드 사용
        Long sessionId = (long) roomId.hashCode();

        Match match = Match.builder()
                .sessionId(sessionId) // TODO: 추후 String roomId로 변경 권장
                .maleId(maleId)
                .femaleId(femaleId)
                .build();

        return matchRepository.save(match);
    }

    /**
     * 사용자의 활성화된 쪽지방 목록을 조회
     * 
     * @param userId 현재 로그인한 사용자 ID
     * @return 최신 메시지 순으로 정렬된 매칭 응답 DTO 리스트
     */
    public List<MatchDto.Response> getMyMatches(Long userId) {
        List<Match> matches = matchRepository.findMyMatches(userId);

        // 상대방 ID 추출
        java.util.Set<Long> opponentIds = matches.stream()
                .map(match -> match.getMaleId().equals(userId) ? match.getFemaleId() : match.getMaleId())
                .collect(Collectors.toSet());

        // 상대방 정보 일괄 조회
        java.util.Map<Long, com.ssafya701.roundy.auth.entity.User> userMap = userRepository.findAllById(opponentIds)
                .stream()
                .collect(Collectors.toMap(com.ssafya701.roundy.auth.entity.User::getId, user -> user));

        return matches.stream()
                .map(match -> {
                    Long opponentId = match.getMaleId().equals(userId) ? match.getFemaleId() : match.getMaleId();
                    com.ssafya701.roundy.auth.entity.User opponent = userMap.get(opponentId);

                    if (opponent == null) {
                        // 탈퇴했거나 정보가 없는 경우 더미 객체 혹은 예외 처리
                        // 여기서는 편의상 null 처리를 막기 위해 빌더로 임시 객체 생성 등을 고려할 수 있으나,
                        // DB 무결성 상 존재해야 함. 만약 없다면 "알 수 없음" 처리
                        opponent = com.ssafya701.roundy.auth.entity.User.builder()
                                .nickName("(알 수 없음)")
                                .build();
                    }
                    return MatchDto.Response.from(match, opponent);
                })
                .collect(Collectors.toList());
    }

    /**
     * 매칭 PK로 특정 매칭 정보를 조회
     * 
     * @param matchId 조회할 매칭 ID
     * @return 매칭 엔티티
     * @throws BusinessLogicException 해당 ID의 매칭이 존재하지 않을 경우 발생
     */
    public Match getMatchById(Long matchId, Long userId) {

        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new CustomException(ErrorEnum.MATCH_NOT_FOUND));

        // 접근 권한 검증
        validateParticipant(match, userId);

        return match;
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
                .orElseThrow(() -> new CustomException(ErrorEnum.MATCH_NOT_FOUND));

        // 참여자 검증
        validateParticipant(match, userId);

        // 이미 나간 사용자인지 확인
        if (isUserAlreadyLeft(match, userId)) {
            throw new BusinessLogicException("이미 종료하거나 나간 대화방입니다.");
        }

        // 상태 변경 (이탈 처리)
        match.terminateChat(userId);

        /**
         * 양쪽 모두 나간 경우
         */
        // 양쪽 모두 나갔는지 확인
        if (match.getMaleLeftAt() != null && match.getFemaleLeftAt() != null) {

            // 연관된 메시지 데이터 영구 삭제
            chatMessageRepository.deleteAllByMatchId(matchId);

            // 매칭 데이터 영구 삭제
            // matchRepository.delete(match);
            match.markAsDeleted();

            return MatchDto.LeaveResponse.from(match);
        }

        /**
         * 한 명만 나간 경우
         */
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

    /**
     * 검증 메서드
     */

    private void validateParticipant(Match match, Long userId) {
        if (!match.getMaleId().equals(userId) && !match.getFemaleId().equals(userId)) {
            throw new CustomException(ErrorEnum.MATCH_ACCESS_DENIED);
        }
    }

    private boolean isUserAlreadyLeft(Match match, Long userId) {
        if (match.getMaleId().equals(userId)) {
            return match.getMaleLeftAt() != null;
        } else {
            return match.getFemaleLeftAt() != null;
        }
    }

}
