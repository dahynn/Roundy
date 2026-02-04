package com.ssafya701.roundy.match.controller;

import com.ssafya701.roundy.global.auth.PrincipalDetails;
import com.ssafya701.roundy.global.common.CommonResponse;
import com.ssafya701.roundy.match.dto.MatchDto;
import com.ssafya701.roundy.match.service.MatchService;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;

    // 내 쪽지함 조회
    @GetMapping
    public CommonResponse<List<MatchDto.Response>> getMyMatches(
            @Parameter(hidden = true) @AuthenticationPrincipal PrincipalDetails principal
    ) {

        Long userId = principal.getUser().getId();

        List<MatchDto.Response> responses = matchService.getMyMatches(userId);

        return CommonResponse.ofSuccess(responses);

    }

    // 내 쪽지함 히스토리 조회 (전체)
    @GetMapping("/history")
    public CommonResponse<List<MatchDto.Response>> getMatchHistory(
            @Parameter(hidden = true) @AuthenticationPrincipal PrincipalDetails principal
    ) {
        Long userId = principal.getUser().getId();
        List<MatchDto.Response> responses = matchService.getMatchHistory(userId);
        return CommonResponse.ofSuccess(responses);
    }

    // 쪽지방 나가기
    @PostMapping("/{matchId}/leave")
    public CommonResponse<MatchDto.LeaveResponse> leaveMatch(
            @PathVariable Long matchId,
            @Parameter(hidden = true) @AuthenticationPrincipal PrincipalDetails principal
    ) {

        Long userId = principal.getUser().getId();

        MatchDto.LeaveResponse response = matchService.leaveMatch(matchId, userId);

        return CommonResponse.ofSuccess(response);

    }

}
