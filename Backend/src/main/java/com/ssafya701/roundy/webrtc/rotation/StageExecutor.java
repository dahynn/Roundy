package com.ssafya701.roundy.webrtc.rotation;

import com.ssafya701.roundy.webrtc.room.ParticipantState;
import com.ssafya701.roundy.webrtc.room.RoomState;
import com.ssafya701.roundy.webrtc.room.enums.Stage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Stage 기반 로테이션 실행 로직
 * RotationScheduler의 State Machine 기능 확장
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StageExecutor {
    
    private final RoomEventPublisher eventPublisher;
    private final PairingStrategy pairingStrategy = new PairingStrategy();
    
    /**
     * 자기소개 단계 실행
     */
    public void executeSelfIntro(RoomState room) {
        // 발언자 큐 초기화 (랜덤 순서)
        room.initializeSpeakerQueue();
        
        // STAGE_CHANGE 브로드캐스트
        eventPublisher.publishStageChange(room, Stage.SELF_INTRO);
        
        // 첫 번째 발언자 지정
        Long speakerId = room.assignNextSpeaker();
        if (speakerId != null) {
            eventPublisher.publishSpeakerChange(room, speakerId, 60);
        }
        
        log.info("자기소개 시작: roomId={}, 첫 발언자={}", room.getRoomId(), speakerId);
    }
    
    /**
     * 투표 단계 실행
     * @param isFirst true: 첫인상 투표, false: 최종 투표
     */
    public void executeVote(RoomState room, boolean isFirst) {
        Stage stage = isFirst ? Stage.VOTE_FIRST : Stage.VOTE_FINAL;
        
        // STAGE_CHANGE 브로드캐스트
        eventPublisher.publishStageChange(room, stage);
        
        log.info("투표 시작: roomId={}, type={}", 
                room.getRoomId(), isFirst ? "첫인상" : "최종");
        
        // ========================================
        // 🧪 테스트용 하드코딩: 자동 투표 시뮬레이션
        // TODO: 테스트 완료 후 삭제 또는 주석 처리 필요!
        // ========================================
        if (!isFirst) {  // 최종 투표에만 적용
            injectTestVotes(room);
        }
        // ========================================
    }
    
    /**
     * 🧪 테스트용: 하드코딩된 투표 자동 주입
     * 
     * 시나리오:
     * - Alice (ID: 1) → Bob (ID: 2)
     * - Bob (ID: 2) → Alice (ID: 1)  ✅ 매칭 성공!
     * - Charlie (ID: 3) → Diana (ID: 4)
     * - Diana (ID: 4) → Bob (ID: 2)  ❌ 일방적
     * 
     * TODO: 테스트 완료 후 이 메서드와 호출 부분 모두 삭제!
     */
    private void injectTestVotes(RoomState room) {
        java.util.List<com.ssafya701.roundy.webrtc.room.ParticipantState> participants = room.getParticipantList();
        
        if (participants.size() < 4) {
            log.warn("⚠️  테스트 투표 주입 실패: 참가자 4명 미만 ({}명)", participants.size());
            return;
        }
        
        // 참가자 ID 추출 (입장 순서대로 Alice, Bob, Charlie, Diana라고 가정)
        Long aliceId = participants.get(0).getUserId();
        Long bobId = participants.get(1).getUserId();
        Long charlieId = participants.get(2).getUserId();
        Long dianaId = participants.get(3).getUserId();
        
        // 첫인상 투표 주입
        room.submitVote(aliceId, bobId, false);    // Alice → Bob
        room.submitVote(bobId, aliceId, false);    // Bob → Alice
        room.submitVote(charlieId, dianaId, false); // Charlie → Diana
        room.submitVote(dianaId, bobId, false);    // Diana → Bob
        
        // 최종 투표 주입 (동일)
        room.submitVote(aliceId, bobId, true);     // Alice → Bob
        room.submitVote(bobId, aliceId, true);     // Bob → Alice
        room.submitVote(charlieId, dianaId, true); // Charlie → Diana
        room.submitVote(dianaId, bobId, true);     // Diana → Bob
        
        log.warn("🧪 [테스트] 자동 투표 주입 완료!");
        log.warn("   - {} → {} (매칭 예정)", aliceId, bobId);
        log.warn("   - {} → {} (매칭 예정)", bobId, aliceId);
        log.warn("   - {} → {} (일방적)", charlieId, dianaId);
        log.warn("   - {} → {} (일방적)", dianaId, bobId);
        log.warn("   ✅ 예상 매칭: Alice({})-Bob({}) 1쌍", aliceId, bobId);
    }
    
    /**
     * 1:1 대화 단계 실행
     * @param isLong true: 긴 대화 (7분), false: 짧은 대화 (3분)
     */
    public void executeRotation(RoomState room, boolean isLong) {
        Stage stage = isLong ? Stage.ROTATION_LONG : Stage.ROTATION_SHORT;
        
        // 페어 배정
        java.util.List<ParticipantState> participants = room.getParticipantList();
        java.util.List<PairingStrategy.Pair> pairs = pairingStrategy.calculatePairs(
            participants,
            stage.getOrder()
        );
        
        // userId -> partnerId 맵 생성
        java.util.Map<Long, Long> pairMap = new java.util.HashMap<>();
        for (PairingStrategy.Pair pair : pairs) {
            pairMap.put(pair.getUserId1(), pair.getUserId2());
            if (pair.getUserId2() != null) {
                pairMap.put(pair.getUserId2(), pair.getUserId1());
            }
        }
        
        // STAGE_CHANGE 브로드캐스트
        eventPublisher.publishStageChange(room, stage);
        
        // PAIR_ASSIGNED 발행
        eventPublisher.publishPairAssignments(room, stage.getOrder(), pairMap);
        
        // 현재 페어링 정보 저장 (파트너 이탈 감지용)
        room.setCurrentPairing(pairMap);
        
        log.info("1:1 대화 시작: roomId={}, type={}, 페어 {}쌍", 
                room.getRoomId(), isLong ? "긴 대화" : "짧은 대화", pairs.size());
    }
    
    /**
     * 게임 단계 실행
     */
    public void executeGame(RoomState room) {
        // STAGE_CHANGE 브로드캐스트
        eventPublisher.publishStageChange(room, Stage.IMAGE_GAME);
        
        // TODO: 게임 문제 출제 로직
        log.info("게임 시작: roomId={}", room.getRoomId());
    }
    
    /**
     * 매칭 결과 발표 단계 실행
     */
    public void executeMatching(RoomState room) {
        // STAGE_CHANGE 브로드캐스트
        eventPublisher.publishStageChange(room, Stage.MATCHING_RESULT);
        
        // 매칭 결과 계산 (쌍방 선택 확인)
        java.util.List<RoomState.MatchPair> matches = room.calculateMatches();
        
        // 각 참가자에게 개별 전송
        for (ParticipantState participant : room.getParticipantList()) {
            RoomState.MatchPair result = room.getMatchResultForUser(participant.getUserId());
            eventPublisher.publishMatchResult(participant, result);
        }
        
        log.info("💕 매칭 결과: roomId={}, 성공 커플 {}쌍", room.getRoomId(), matches.size());
    }
    
    /**
     * 얼굴 공개 단계 실행
     */
    public void executeFaceReveal(RoomState room) {
        // STAGE_CHANGE 브로드캐스트
        eventPublisher.publishStageChange(room, Stage.FACE_REVEAL);
        
        // 매칭된 커플에게만 프라이빗 세션으로 초대
        java.util.List<RoomState.MatchPair> matches = room.getMatchedCouples();
        eventPublisher.publishFaceRevealStart(room, matches);
        
        log.info("얼굴 공개: roomId={}, 매칭 커플 {}쌍", room.getRoomId(), matches.size());
    }
}
