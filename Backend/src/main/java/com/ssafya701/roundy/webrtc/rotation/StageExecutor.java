package com.ssafya701.roundy.webrtc.rotation;

import com.ssafya701.roundy.match.service.MatchService;
import com.ssafya701.roundy.match.entity.Match;
import com.ssafya701.roundy.webrtc.game.GameQuestion;
import com.ssafya701.roundy.webrtc.game.GameQuestionRepository;
import com.ssafya701.roundy.webrtc.room.ParticipantState;
import com.ssafya701.roundy.webrtc.room.RoomState;
import com.ssafya701.roundy.webrtc.room.enums.Gender;
import com.ssafya701.roundy.webrtc.room.enums.Stage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Stage 기반 로테이션 실행 로직
 * RotationScheduler의 State Machine 기능 확장
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StageExecutor {
    
    private final RoomEventPublisher eventPublisher;
    private final MatchService matchService;
    private final GameQuestionRepository questionRepository;
    private final PairingStrategy pairingStrategy = new PairingStrategy();
    private final ScheduledExecutorService gameScheduler = Executors.newScheduledThreadPool(10);
    
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
        // ========================================
        // 🧪 테스트용 하드코딩: 자동 투표 시뮬레이션
        // TODO: 테스트 완료 후 삭제 또는 주석 처리 필요!
        // ========================================
        // if (!isFirst) {  // 최종 투표에만 적용
        //     injectTestVotes(room);
        // }
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
    // private void injectTestVotes(RoomState room) {
    //     java.util.List<com.ssafya701.roundy.webrtc.room.ParticipantState> participants = room.getParticipantList();
    //     
    //     if (participants.size() < 4) {
    //         log.warn("⚠️  테스트 투표 주입 실패: 참가자 4명 미만 ({}명)", participants.size());
    //         return;
    //     }
    //     
    //     // 참가자 ID 추출 (입장 순서대로 Alice, Bob, Charlie, Diana라고 가정)
    //     Long aliceId = participants.get(0).getUserId();
    //     Long bobId = participants.get(1).getUserId();
    //     Long charlieId = participants.get(2).getUserId();
    //     Long dianaId = participants.get(3).getUserId();
    //     
    //     // 첫인상 투표 주입
    //     room.submitVote(aliceId, bobId, false);    // Alice → Bob
    //     room.submitVote(bobId, aliceId, false);    // Bob → Alice
    //     room.submitVote(charlieId, dianaId, false); // Charlie → Diana
    //     room.submitVote(dianaId, bobId, false);    // Diana → Bob
    //     
    //     // 최종 투표 주입 (동일)
    //     room.submitVote(aliceId, bobId, true);     // Alice → Bob
    //     room.submitVote(bobId, aliceId, true);     // Bob → Alice
    //     room.submitVote(charlieId, dianaId, true); // Charlie → Diana
    //     room.submitVote(dianaId, bobId, true);     // Diana → Bob
    //     
    //     log.warn("🧪 [테스트] 자동 투표 주입 완료!");
    //     log.warn("   - {} → {} (매칭 예정)", aliceId, bobId);
    //     log.warn("   - {} → {} (매칭 예정)", bobId, aliceId);
    //     log.warn("   - {} → {} (일방적)", charlieId, dianaId);
    //     log.warn("   - {} → {} (일방적)", dianaId, bobId);
    //     log.warn("   ✅ 예상 매칭: Alice({})-Bob({}) 1쌍", aliceId, bobId);
    // }
    
    /**
     * 1:1 대화 단계 실행
     * @param isLong true: 긴 대화 (7분), false: 짧은 대화 (3분)
     */
    public void executeRotation(RoomState room, boolean isLong) {
        Stage stage = isLong ? Stage.ROTATION_LONG : Stage.ROTATION_SHORT;
        
        // 페어 배정
        java.util.List<ParticipantState> participants = room.getParticipantList();
        
        // PAIR_ONLY 모드는 성별 기반 매칭, FREE_TALK 모드는 성별 무관 매칭
        boolean genderBased = room.isPairMode();
        
        // StageScheduler에서 관리하는 동적 라운드 번호 사용
        // (1, 2, ... 인원수만큼 증가)
        int roundNumber = room.getCurrentRotationRound();
        
        List<PairingStrategy.Pair> pairs = pairingStrategy.calculatePairs(
            participants,
            roundNumber,
            genderBased
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
        
        log.info("1:1 대화 시작: roomId={}, type={}, mode={} 페어 {}쌍", 
                room.getRoomId(), isLong ? "긴 대화" : "짧은 대화", 
                genderBased ? "성별 기반" : "성별 무관", pairs.size());
    }
    
    /**
     * 게임 단계 실행 (이미지 게임 - 투표 기반)
     * 5개 문제를 순차적으로 출제, 각 문제당 10초 투표 시간
     */
    public void executeGame(RoomState room) {
        // STAGE_CHANGE 브로드캐스트
        eventPublisher.publishStageChange(room, Stage.IMAGE_GAME);
        
        List<GameQuestion> questions = questionRepository.getAllQuestions();
        room.setCurrentGameQuestion(0);
        
        log.info("게임 시작: roomId={}, 문제 수={}개", room.getRoomId(), questions.size());
        
        // 첫 번째 문제 출제
        scheduleNextQuestion(room, questions, 0);
    }
    
    /**
     * 다음 게임 문제 스케줄링
     * @param index 현재 문제 인덱스 (0-based)
     */
    private void scheduleNextQuestion(RoomState room, List<GameQuestion> questions, int index) {
        if (index >= questions.size()) {
            // 모든 문제 완료
            log.info("게임 종료: roomId={}, 전체 {}문제 완료", room.getRoomId(), questions.size());
            return;
        }
        
        GameQuestion question = questions.get(index);
        room.setCurrentGameQuestion(question.getQuestionNumber());
        
        // 문제 출제
        eventPublisher.publishGameQuestion(room, question);
        log.info("게임 문제 출제: roomId={}, question={}/{} - {}", 
                room.getRoomId(), question.getQuestionNumber(), questions.size(), question.getQuestion());
        
        // 10초 후 자동 결과 집계 및 다음 문제 출제
        gameScheduler.schedule(() -> {
            try {
                // 결과 집계 및 브로드캐스트
                processGameResults(room, question);
                
                // 1초 대기 후 다음 문제 출제 (결과 확인 시간)
                gameScheduler.schedule(() -> {
                    scheduleNextQuestion(room, questions, index + 1);
                }, 1, TimeUnit.SECONDS);
                
            } catch (Exception e) {
                log.error("게임 결과 처리 실패: roomId={}, question={}", 
                        room.getRoomId(), question.getQuestionNumber(), e);
            }            
        }, 10, TimeUnit.SECONDS);
    }
    
    /**
     * 게임 투표 결과 집계 및 발표
     */
    private void processGameResults(RoomState room, GameQuestion question) {
        Map<Long, Integer> voteCounts = room.calculateGameResults(question.getQuestionNumber());
        
        // 1등 찾기 (득표수 기준)
        Long winnerId = voteCounts.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse(null);
        
        // 결과 브로드캐스트
        eventPublisher.publishGameResult(room, question, winnerId, voteCounts);
        
        if (winnerId != null) {
            String winnerNickname = room.getParticipant(winnerId)
                .map(ParticipantState::getNickname)
                .orElse("Unknown");
            log.info("게임 결과: roomId={}, question={}, winner={} ({}), 득표수={}", 
                    room.getRoomId(), question.getQuestionNumber(), 
                    winnerId, winnerNickname, voteCounts.get(winnerId));
        } else {
            log.info("게임 결과: roomId={}, question={}, 투표 없음", 
                    room.getRoomId(), question.getQuestionNumber());
        }
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
        
        // ✅ 10초 후 방 자동 초기화
        java.util.concurrent.ScheduledExecutorService scheduler = 
            java.util.concurrent.Executors.newSingleThreadScheduledExecutor();
        scheduler.schedule(() -> {
            log.info("🔄 방 자동 초기화: roomId={}", room.getRoomId());
            room.reset();
            try {
                eventPublisher.broadcastRoomState(room);
            } catch (java.io.IOException e) {
                log.error("방 초기화 후 상태 브로드캠스트 실패", e);
            }
            scheduler.shutdown();
        }, 10, java.util.concurrent.TimeUnit.SECONDS);
    }
    
    /**
     * 얼굴 공개 단계 실행
     */
    public void executeFaceReveal(RoomState room) {
        java.util.List<RoomState.MatchPair> matches = room.getMatchedCouples();
        
        // ✅ 매칭된 커플에게만 STAGE_CHANGE 전송
        for (RoomState.MatchPair couple : matches) {
            eventPublisher.publishStageChangeToUser(room, couple.getUserId1(), Stage.FACE_REVEAL, 180);
            eventPublisher.publishStageChangeToUser(room, couple.getUserId2(), Stage.FACE_REVEAL, 180);
        }
        
        // ✅ 싱글 유저 강퇴
        java.util.List<Long> singleUsers = room.getSingleUsers();
        for (Long userId : singleUsers) {
            try {
                com.ssafya701.roundy.webrtc.message.outbound.KickMessage kickMsg = 
                    new com.ssafya701.roundy.webrtc.message.outbound.KickMessage(
                        "최종 매칭에 실패했습니다. 다음 기회에 도전해주세요!"
                    );
                eventPublisher.sendToUser(room, userId, kickMsg);
                
                // 2초 대기 후 참가자 제거
                java.util.concurrent.ScheduledExecutorService scheduler = 
                    java.util.concurrent.Executors.newSingleThreadScheduledExecutor();
                scheduler.schedule(() -> {
                    room.removeParticipant(userId);
                    log.info("🚺 매칭 실패 사용자 강퇴: userId={}", userId);
                    scheduler.shutdown();
                }, 2, java.util.concurrent.TimeUnit.SECONDS);
                
            } catch (java.io.IOException e) {
                log.error("강퇴 메시지 전송 실패: userId={}", userId, e);
            }
        }
        
        // 매칭된 커플에게만 프라이빗 세션으로 초대
        eventPublisher.publishFaceRevealStart(room, matches);
        log.info("얼굴 공개: roomId={}, 매칭 커플 {}쌍, 강퇴 {}명", 
            room.getRoomId(), matches.size(), singleUsers.size());
    }
}
