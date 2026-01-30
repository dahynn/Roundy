package com.ssafya701.roundy.chatmessage.controller;

import com.ssafya701.roundy.chatmessage.dto.ChatMessageDto;
import com.ssafya701.roundy.chatmessage.service.ChatMessageService;
import com.ssafya701.roundy.global.auth.PrincipalDetails;
import com.ssafya701.roundy.global.common.CommonResponse;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/matches/{matchId}/messages")
@RequiredArgsConstructor
public class ChatMessageController {

    private final ChatMessageService chatMessageService;

    // 쪽지 목록 조회 (폴링 = 실시간)
    @GetMapping
    public CommonResponse<List<ChatMessageDto.Response>> getMessages(
            @PathVariable Long matchId,
            @RequestParam(required = false) Long lastMessageId,
            @RequestParam(defaultValue = "50") int size,
            @Parameter(hidden = true) @AuthenticationPrincipal PrincipalDetails principal
    ) {

        Long userId = principal.getUser().getId();

        List<ChatMessageDto.Response> responses = chatMessageService.getMessages(matchId, userId, lastMessageId, size);

        return CommonResponse.ofSuccess(responses);

    }

    // 쪽지 전송
    @PostMapping
    public CommonResponse<ChatMessageDto.Response> sendMessage(
            @PathVariable Long matchId,
            @RequestBody ChatMessageDto.Request request,
            @Parameter(hidden = true) @AuthenticationPrincipal PrincipalDetails principal
    ) {

        Long senderId = principal.getUser().getId();

        ChatMessageDto.Response response = chatMessageService.sendMessage(matchId, senderId, request);

        return CommonResponse.ofSuccess(response);

    }

}