package com.ssafya701.roundy.chatmessage.service;

import com.ssafya701.roundy.chatmessage.dto.ChatMessageRequest;
import com.ssafya701.roundy.chatmessage.dto.ChatMessageResponse;
import com.ssafya701.roundy.chatmessage.entity.ChatMessage;
import com.ssafya701.roundy.chatmessage.enums.MsgType;
import com.ssafya701.roundy.chatmessage.repository.ChatMessageRepository;
import com.ssafya701.roundy.global.error.BusinessLogicException;
import com.ssafya701.roundy.match.entity.Match;
import com.ssafya701.roundy.match.enums.ChatStatus;
import com.ssafya701.roundy.match.repository.MatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatMessageService {

    private final ChatMessageRepository chatMessageRepository;
    private final MatchRepository matchRepository;

    /**
     * 특정 매칭 방에 쪽지를 전송하고 방의 상태(마지막 메시지 정보)를 갱신함
     *
     * @param matchId  대상 쪽지방 ID
     * @param senderId 발신자 고유 ID
     * @param request  메시지 내용을 담은 DTO
     * @return 저장된 메시지 정보 (ChatMessageResponse)
     * @throws BusinessLogicException 존재하지 않는 방이거나, 종료된(TERMINATED) 방일 경우 발생
     */
    @Transactional
    public ChatMessageResponse sendMessage(Long matchId, Long senderId, ChatMessageRequest request) {

        // 매칭 정보 유효성 검증
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new BusinessLogicException("존재하지 않는 쪽지방입니다."));

        // 대화 가능 상태 확인 (이미 종료된 매칭인 경우 전송 불가)
        if (match.getChatStatus() == ChatStatus.TERMINATED) {
            throw new BusinessLogicException("종료된 대화방에는 쪽지를 보낼 수 없습니다.");
        }

        // 수신자 결정
        // 발신자 | 수신자
        // 남Id    여Id
        // 여Id    남Id
        Long receiverId = match.getMaleId().equals(senderId) ? match.getFemaleId() : match.getMaleId();

        // 메시지 생성 및 저장
        ChatMessage message = ChatMessage.builder()
                .matchId(matchId)
                .senderId(senderId)
                .receiverId(receiverId)
                .content(request.getContent())
                .msgType(MsgType.TALK)
                .build();

        ChatMessage savedMessage = chatMessageRepository.save(message);

        // Match 테이블의 마지막 메시지(미리보기 정보) 업데이트
        match.updateLastMessage(savedMessage.getContent(), LocalDateTime.now());

        return ChatMessageResponse.from(savedMessage);
    }

    /**
     * 쪽지 목록을 조회함 (페이징 또는 폴링 방식으로 동작)
     *
     * @param matchId       조회할 쪽지방 ID
     * @param lastMessageId 마지막으로 확인한 메시지 ID (null일 경우 초기 진입으로 판단)
     * @param size          조회할 메시지 개수 (초기 진입 시 사용)
     * @return 메시지 리스트 (시간순 정렬)
     */
    public List<ChatMessageResponse> getMessages(Long matchId, Long lastMessageId, int size) {

        List<ChatMessage> messages;

        if (lastMessageId == null) {
            // case 1: 쪽지방 처음 진입 시
            // 최근 메시지부터 역순으로 size만큼 조회
            Pageable pageable = PageRequest.of(0, size);
            messages = chatMessageRepository.findByMatchIdOrderByIdDesc(matchId, pageable);

            // 사용자 화면에는 과거 -> 현재 순으로 보여야 하기에 리스트 역순처리
            Collections.reverse(messages);
        } else {
            // case 2: 쪽지 실시간 업데이트 (폴링)
            // 사용자가 가진 마지막 ID보다 큰(이후에 생성된) 메시지만 모두 가져옴
            messages = chatMessageRepository.findByMatchIdAndIdGreaterThanOrderByIdAsc(matchId, lastMessageId);
        }

        return messages.stream()
                .map(ChatMessageResponse::from)
                .collect(Collectors.toList());

    }
}
