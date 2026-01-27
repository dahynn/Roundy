package com.ssafya701.roundy.match.controller;

import com.ssafya701.roundy.global.common.CommonResponse;
import com.ssafya701.roundy.match.dto.MatchResponse;
import com.ssafya701.roundy.match.service.MatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;

    // 내 쪽지함 조회
    @GetMapping
    public CommonResponse<List<MatchResponse>> getMyMatches() {

        // TODO: 로그인 구현이 완료되면 토큰을 통해 현재 로그인한 유저 ID를 가져와야 함
        Long userId = 1L; // 임시 하드코딩

        List<MatchResponse> responses = matchService.getMyMatches(userId);

        return CommonResponse.ofSuccess(responses);

    }
}
