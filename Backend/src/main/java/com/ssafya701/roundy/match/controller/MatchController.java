package com.ssafya701.roundy.match.controller;

import com.ssafya701.roundy.global.common.CommonResponse;
import com.ssafya701.roundy.match.dto.MatchDto;
import com.ssafya701.roundy.match.service.MatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;

    // 내 쪽지함 조회
    @GetMapping
    public CommonResponse<List<MatchDto.Response>> getMyMatches() {

        // TODO: 로그인 구현이 완료되면 토큰을 통해 현재 로그인한 유저 ID를 가져와야 함
        Long userId = 1L; // 임시 하드코딩

        List<MatchDto.Response> responses = matchService.getMyMatches(userId);

        return CommonResponse.ofSuccess(responses);

    }

    // 쪽지방 나가기
    @PostMapping("/{matchId}/leave")
    public CommonResponse<MatchDto.LeaveResponse> leaveMatch(@PathVariable Long matchId) {

        // TODO: 로그인 구현이 완료되면 토큰을 통해 현재 로그인한 유저 ID를 가져와야 함
        Long userId = 1L; // 임시 하드코딩

        MatchDto.LeaveResponse response = matchService.leaveMatch(matchId, userId);

        return CommonResponse.ofSuccess(response);

    }

}
