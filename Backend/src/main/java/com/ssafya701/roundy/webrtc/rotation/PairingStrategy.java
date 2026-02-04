package com.ssafya701.roundy.webrtc.rotation;

import com.ssafya701.roundy.webrtc.room.ParticipantState;
import com.ssafya701.roundy.webrtc.room.enums.Gender;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.ToString;
import lombok.extern.slf4j.Slf4j;

import java.util.*;

/**
 * 페어링 전략 (Round-Robin)
 * PAIR_ONLY 모드에서 참가자들을 라운드마다 1:1로 매칭
 */
@Slf4j
public class PairingStrategy {
    
    /**
     * 페어 정보
     */
    @Getter
    @AllArgsConstructor
    @ToString
    public static class Pair {
        private final Long userId1;
        private final Long userId2;  // null이면 혼자
        
        public boolean isSingle() {
            return userId2 == null;
        }
    }
    
    /**
     * 페어 계산 (성별 기반 여부에 따라 다른 알고리즘 사용)
     * 
     * @param participants 참가자 리스트
     * @param roundNumber 현재 라운드 번호 (1부터 시작)
     * @param genderBased true: 남녀 매칭만, false: 성별 무관 매칭
     * @return 페어 리스트
     */
    public List<Pair> calculatePairs(List<ParticipantState> participants, int roundNumber, boolean genderBased) {
        if (genderBased) {
            return calculateGenderBasedPairs(participants, roundNumber);
        } else {
            return calculateGenderNeutralPairs(participants, roundNumber);
        }
    }
    
    /**
     * 성별 기반 Round-Robin 페어링 (남녀 동수 전제)
     * 남자와 여자를 1:1로만 매칭
     * 
     * @param participants 참가자 리스트
     * @param roundNumber 현재 라운드 번호 (1부터 시작)
     * @return 남녀 페어 리스트
     */
    public List<Pair> calculateGenderBasedPairs(List<ParticipantState> participants, int roundNumber) {
        // 1. 성별로 분리
        List<ParticipantState> males = new ArrayList<>();
        List<ParticipantState> females = new ArrayList<>();
        
        for (ParticipantState p : participants) {
            if (p.getGender() == Gender.MALE) {
                males.add(p);
            } else if (p.getGender() == Gender.FEMALE) {
                females.add(p);
            }
        }
        
        int maleCount = males.size();
        int femaleCount = females.size();
        
        if (maleCount == 0 || femaleCount == 0) {
            log.warn("성별 기반 페어링 불가: 남자={}명, 여자={}명", maleCount, femaleCount);
            return Collections.emptyList();
        }
        
        if (maleCount != femaleCount) {
            log.warn("남녀 동수가 아님: 남자={}명, 여자={}명 - 비대칭 매칭 시도", maleCount, femaleCount);
        }
        
        log.info("성별 기반 페어링 시작: 남자={}명, 여자={}명, 라운드={}", maleCount, femaleCount, roundNumber);
        
        // 2. 남녀 매칭 (짝수 인원 가정)
        int count = Math.min(maleCount, femaleCount);
        List<Pair> pairs = new ArrayList<>();
        
        for (int i = 0; i < count; i++) {
            // 남자는 순서대로, 여자는 회전시켜 매칭
            int maleIndex = i;
            int femaleIndex = (i + roundNumber - 1) % count;
            
            pairs.add(new Pair(
                males.get(maleIndex).getUserId(),
                females.get(femaleIndex).getUserId()
            ));
            
            log.debug("페어 생성: 남자={}, 여자={}", 
                    males.get(maleIndex).getUserId(), 
                    females.get(femaleIndex).getUserId());
        }
        
        // 3. 남은 사람들 처리 (비대칭인 경우)
        if (maleCount > count) {
            for (int i = count; i < maleCount; i++) {
                pairs.add(new Pair(males.get(i).getUserId(), null));
                log.debug("단독 참가자 (남자): {}", males.get(i).getUserId());
            }
        }
        if (femaleCount > count) {
            for (int i = count; i < femaleCount; i++) {
                pairs.add(new Pair(females.get(i).getUserId(), null));
                log.debug("단독 참가자 (여자): {}", females.get(i).getUserId());
            }
        }
        
        log.info("성별 기반 페어링 완료: {}개 페어 생성", pairs.size());
        return pairs;
    }
    
    /**
     * 성별 무관 Round-Robin 페어링
     * 
     * 알고리즘:
     * - 참가자 수가 짝수: 모두 페어링
     * - 참가자 수가 홀수: 한 명은 혼자 (매 라운드마다 돌아가며)
     * 
     * Round-Robin 매칭 방식:
     * - 첫 번째 참가자는 고정, 나머지는 회전
     * - 예: [0,1,2,3] → R1: (0,3)(1,2) → R2: (0,2)(3,1) → R3: (0,1)(2,3)
     * 
     * @param participants 참가자 리스트
     * @param roundNumber 현재 라운드 번호 (1부터 시작)
     * @return 페어 리스트
     */
    private List<Pair> calculateGenderNeutralPairs(List<ParticipantState> participants, int roundNumber) {
        int size = participants.size();
        
        if (size < 2) {
            log.warn("페어링 불가: 참가자 수 부족 ({}명)", size);
            return Collections.emptyList();
        }
        
        log.info("페어링 계산 시작: 참가자 {}명, 라운드 {}", size, roundNumber);
        
        // 참가자 리스트 복사
        List<ParticipantState> players = new ArrayList<>(participants);
        
        // 홀수인 경우 처리
        boolean hasOddPlayer = size % 2 == 1;
        ParticipantState oddPlayer = null;
        
        if (hasOddPlayer) {
            // 라운드마다 돌아가며 쉬는 사람 결정
            int oddIndex = (roundNumber - 1) % size;
            oddPlayer = players.remove(oddIndex);
            log.debug("홀수 참가자 처리: userId={}가 라운드 {} 대기", oddPlayer.getUserId(), roundNumber);
        }
        
        List<Pair> pairs = new ArrayList<>();
        int n = players.size();  // 짝수로 정규화된 참가자 수
        
        if (n == 0) {
            if (hasOddPlayer) {
                pairs.add(new Pair(oddPlayer.getUserId(), null));
            }
            return pairs;
        }
        
        // Round-Robin Tournament 알고리즘
        // 0번은 고정, 나머지는 시계방향으로 회전
        int[] positions = new int[n];
        positions[0] = 0;  // 첫 번째는 항상 고정
        
        // 나머지 위치 계산 (회전)
        for (int i = 1; i < n; i++) {
            // (roundNumber - 1) 만큼 회전
            int rotated = ((i - 1) + (roundNumber - 1)) % (n - 1) + 1;
            positions[i] = rotated;
        }
        
        // 페어 생성 (앞에서부터 순서대로, 뒤에서부터 순서대로 매칭)
        int pairCount = n / 2;
        for (int i = 0; i < pairCount; i++) {
            int index1 = positions[i];
            int index2 = positions[n - 1 - i];
            
            ParticipantState p1 = players.get(index1);
            ParticipantState p2 = players.get(index2);
            
            pairs.add(new Pair(p1.getUserId(), p2.getUserId()));
            log.debug("페어 생성: ({}, {})", p1.getUserId(), p2.getUserId());
        }
        
        // 홀수 참가자 추가
        if (hasOddPlayer) {
            pairs.add(new Pair(oddPlayer.getUserId(), null));
            log.debug("단독 참가자: {}", oddPlayer.getUserId());
        }
        
        log.info("페어링 완료: {}개 페어 생성", pairs.size());
        return pairs;
    }
    
    /**
     * 특정 사용자의 파트너 찾기
     * 
     * @param pairs 페어 리스트
     * @param userId 사용자 ID
     * @return 파트너 ID (없으면 null)
     */
    public Long findPartner(List<Pair> pairs, Long userId) {
        for (Pair pair : pairs) {
            if (pair.getUserId1().equals(userId)) {
                return pair.getUserId2();
            }
            if (pair.getUserId2() != null && pair.getUserId2().equals(userId)) {
                return pair.getUserId1();
            }
        }
        return null;
    }
    
    /**
     * 총 라운드 수 계산
     * - 짝수: n-1 라운드 (모든 조합 매칭)
     * - 홀수: n 라운드 (모든 사람이 한 번씩 쉬도록)
     * 
     * @param participantCount 참가자 수
     * @return 총 라운드 수
     */
    public int calculateTotalRounds(int participantCount) {
        if (participantCount < 2) {
            return 0;
        }
        
        // 홀수면 그대로, 짝수면 -1
        if (participantCount % 2 == 1) {
            return participantCount;
        } else {
            return participantCount - 1;
        }
    }
}
