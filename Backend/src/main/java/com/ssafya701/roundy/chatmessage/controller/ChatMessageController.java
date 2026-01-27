package com.ssafya701.roundy.chatmessage.controller;

import com.ssafya701.roundy.chatmessage.dto.ChatMessageRequest;
import com.ssafya701.roundy.chatmessage.dto.ChatMessageResponse;
import com.ssafya701.roundy.chatmessage.service.ChatMessageService;
import com.ssafya701.roundy.global.common.CommonResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/matches/{matchId}/messages")
@RequiredArgsConstructor
public class ChatMessageController {

    private final ChatMessageService chatMessageService;

    // 쪽지 목록 조회 (폴링 = 실시간)
    @GetMapping
    public CommonResponse<List<ChatMessageResponse>> getMessages(
            @PathVariable Long matchId,
            @RequestParam(required = false) Long lastMessageId,
            @RequestParam(defaultValue = "50") int size
    ) {

        List<ChatMessageResponse> responses = chatMessageService.getMessages(matchId, lastMessageId, size);

        return CommonResponse.ofSuccess(responses);

    }

    // 쪽지 전송
    @PostMapping
    public CommonResponse<ChatMessageResponse> sendMessage(
            @PathVariable Long matchId,
            @RequestBody ChatMessageRequest request
    ) {

        // TODO: 로그인 구현이 완료되면 토큰을 통해 현재 로그인한 유저 ID를 가져와야 함
        Long senderId = 1L; // 임시 하드코딩

        ChatMessageResponse response = chatMessageService.sendMessage(matchId, senderId, request);

        return CommonResponse.ofSuccess(response);

    }

}