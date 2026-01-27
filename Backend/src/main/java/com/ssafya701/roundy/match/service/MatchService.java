package com.ssafya701.roundy.match.service;

import com.ssafya701.roundy.global.error.BusinessLogicException;
import com.ssafya701.roundy.match.dto.MatchResponse;
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

    /**
     * 사용자의 활성화된 쪽지방 목록을 조회
     * @param userId 현재 로그인한 사용자 ID
     * @return 최신 메시지 순으로 정렬된 매칭 응답 DTO 리스트
     */
    public List<MatchResponse> getMyMatches(Long userId) {
        return matchRepository.findMyMatches(userId).stream()
                .map(match -> MatchResponse.from(match, userId))
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

}
