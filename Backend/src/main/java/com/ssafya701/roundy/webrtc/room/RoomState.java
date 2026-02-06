package com.ssafya701.roundy.webrtc.room;

import com.ssafya701.roundy.webrtc.room.enums.Gender;
import com.ssafya701.roundy.webrtc.room.enums.RotationMode;
import com.ssafya701.roundy.webrtc.room.enums.Stage;
import com.ssafya701.roundy.webrtc.rotation.RoundInfo;
import lombok.Getter;
import lombok.ToString;
import org.springframework.web.socket.WebSocketSession;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;
import java.util.stream.Collectors;

/**
 * 방 상태 관리 (메모리)
 * 스레드 안전성을 위해 ConcurrentHashMap 사용
 * 
 * ERD 매핑: sessions 테이블과 대응
 * - roomId ↔ sessions.id
 * - mode ↔ WebRTC 전용 (DB에는 없음)
 * - openViduSessionId ↔ OpenVidu 전용
 * 
 * TODO: [DB 연동] 향후 추가할 필드
 * - Integer maleCount, femaleCount (실시간 인원수)
 * - Integer maleMax, femaleMax (DB sessions 테이블에서 가져옴)
 * - SessionStatus status (RECRUITING, ONGOING, CLOSED, CANCELLED)
 */
@Getter
@ToString
public class RoomState {
    private final String roomId;
    private final RotationMode mode;
    private final Map<Long, ParticipantState> participants;
    private final String openViduSessionId;
    private RoundInfo currentRound;
    
    /**
     * DB의 Session 엔티티 PK (Phase 7: 영속화용)
     */
    private Long dbSessionId;

    public void setDbSessionId(Long dbSessionId) {
        this.dbSessionId = dbSessionId;
    }
    
    public Long getDbSessionId() {
        return dbSessionId;
    }
    
    // ========== 8단계 로테이션 필드 ==========
    
    /**
     * 현재 진행 중인 스테이지
     */
    @lombok.Setter
    private Stage currentStage = Stage.WAITING;

    /**
     * 쉬는 시간 이후 진행할 다음 스테이지 저장
     */
    @lombok.Setter
    private Stage pendingNextStage;
    
    /**
     * 스테이지 타이머 (각 Stage 종료 시점에 다음 Stage로 전환)
     */
    private ScheduledFuture<?> stageTimer;
    
    /**
     * 렌더링 완료 대기 중인 사용자 ID 집합 (Phase 8 동기화)
     */
    private Set<Long> pendingRenderUsers = new ConcurrentHashMap().newKeySet();
    
    /**
     * 렌더링 대기 타임아웃 작업
     */
    private ScheduledFuture<?> renderTimeoutTask;
    
    // ... (existing code for votes) ...

    /**
     * 렌더링 대기 초기화
     * @param userIds 대기할 사용자 ID 리스트
     */
    public void initRenderWait(List<Long> userIds) {
        clearRenderWait(); // 기존 작업 정리
        pendingRenderUsers.addAll(userIds);
    }
    
    /**
     * 사용자 렌더링 완료 처리
     * @param userId 완료한 사용자 ID
     * @return 모든 사용자가 준비되었으면 true, 아니면 false
     */
    public boolean markUserReady(Long userId) {
        pendingRenderUsers.remove(userId);
        return pendingRenderUsers.isEmpty();
    }
    
    /**
     * 렌더링 대기 상태 정리
     */
    public void clearRenderWait() {
        pendingRenderUsers.clear();
        if (renderTimeoutTask != null && !renderTimeoutTask.isDone()) {
            renderTimeoutTask.cancel(false);
        }
        renderTimeoutTask = null;
    }
    
    public void setRenderTimeoutTask(ScheduledFuture<?> task) {
        this.renderTimeoutTask = task;
    }
    private final Map<Long, Long> firstVotes = new ConcurrentHashMap<>();  // 첫인상 투표
    private final Map<Long, Long> finalVotes = new ConcurrentHashMap<>();  // 최종 투표
    
    /**
     * 매칭 결과 (MATCHING_RESULT 단계에서 계산됨)
     */
    private List<MatchPair> matchedCouples = new ArrayList<>();
    
    /**
     * 게임 답변 및 뱃지
     */
    private final Map<Long, String> gameBadges = new ConcurrentHashMap<>();
    
    /**
     * 게임 문제 ID (현재 출제된 문제)
     */
    private Long currentGameQuestionId;
    
    /**
     * 자기소개 발언 순서 큐
     */
    private Queue<Long> speakerQueue = new LinkedList<>();
    
    /**
     * 현재 발언자 ID
     */
    private Long currentSpeakerId;
    
    /**
     * 현재 로테이션의 페어링 정보 (userId -> partnerId)
     * 로테이션 단계에서만 사용
     */
    private Map<Long, Long> currentPairing = new ConcurrentHashMap<>();
    
    /**
     * 성별별 인원수 관리
     */
    private Integer maleCount = 0;
    private Integer femaleCount = 0;
    private Integer maleMax = 6;   // 기본값 6명, DB에서 조회 가능
    private Integer femaleMax = 6;  // 기본값 6명, DB에서 조회 가능
    
    /**
     * 게임 투표 데이터
     * questionNumber -> (voterId -> targetUserId)
     */
    private Map<Integer, Map<Long, Long>> gameVotes = new ConcurrentHashMap<>();
    
    /**
     * 현재 게임 문제 번호
     */
    private int currentGameQuestion = 0;
    
    /**
     * 연결 해제된 참가자 추적 (userId -> 연결 해제 시간)
     * 재연결 유예 기간 동안 유지
     */
    private Map<Long, Long> disconnectedParticipants = new ConcurrentHashMap<>();
    
    /**
     * 현재 로테이션 라운드 번호 (1부터 시작)
     * 스테이지 내에서 라운드 반복 시 사용
     */
    private int currentRotationRound = 1;
    
    public void nextRotationRound() {
        this.currentRotationRound++;
    }
    
    public void resetRotationRound() {
        this.currentRotationRound = 1;
    }
    
    public int getCurrentRotationRound() {
        return currentRotationRound;
    }
    
    /**
     * 최대 로테이션 라운드 수 계산
     * 남녀 동수 기준, 모든 이성과 대화하기 위해 필요한 라운드 수
     */
    public int getMaxRotationRounds() {
        // 최소 1라운드는 보장
        if (maleCount == 0 || femaleCount == 0) return 1;
        // 남녀 쌍의 개수만큼 라운드 필요 (예: 3:3이면 3라운드)
        return Math.min(maleCount, femaleCount);
    }
    
    public RoomState(String roomId, RotationMode mode, String openViduSessionId) {
        this.roomId = roomId;
        this.mode = mode;
        this.openViduSessionId = openViduSessionId;
        this.participants = new ConcurrentHashMap<>();
        this.currentRound = null;
    }
    
    /**
     * 참가자 추가
     */
    public void addParticipant(Long userId, String nickname, Gender gender, WebSocketSession session) {
        // 이미 존재하는 참가자인지 확인
        boolean isNew = !participants.containsKey(userId);
        
        // 참가자 정보 추가/갱신
        participants.put(userId, new ParticipantState(userId, nickname, gender, session, null));
        
        // 새로운 참가자인 경우에만 카운트 증가
        if (isNew) {
            if (gender == Gender.MALE) {
                maleCount++;
            } else if (gender == Gender.FEMALE) {
                femaleCount++;
            }
        }
    }
    
    /**
     * 참가자 제거
     */
    public ParticipantState removeParticipant(Long userId) {
        ParticipantState removed = participants.remove(userId);
        
        if (removed != null) {
            // 성별별 인원수 감소
            Gender gender = removed.getGender();
            if (gender == Gender.MALE) {
                maleCount--;
            } else if (gender == Gender.FEMALE) {
                femaleCount--;
            }
        }
        
        return removed;
    }
    
    /**
     * 세션 ID로 참가자 찾기
     */
    public Optional<ParticipantState> findParticipantBySessionId(String sessionId) {
        return participants.values().stream()
                .filter(p -> p.getSessionId().equals(sessionId))
                .findFirst();
    }
    
    /**
     * 참가자 수 반환
     */
    public int getParticipantCount() {
        return participants.size();
    }
    
    /**
     * 모든 참가자 리스트 반환 (복사본)
     */
    public List<ParticipantState> getParticipantList() {
        return new ArrayList<>(participants.values());
    }
    
    /**
     * 특정 참가자 조회
     */
    public Optional<ParticipantState> getParticipant(Long userId) {
        return Optional.ofNullable(participants.get(userId));
    }
    
    /**
     * 남성 참가자 수 반환
     */
    public Integer getMaleCount() {
        return maleCount;
    }
    
    /**
     * 여성 참가자 수 반환
     */
    public Integer getFemaleCount() {
        return femaleCount;
    }
    
    /**
     * 남성 최대 수용 인원
     */
    public Integer getMaleMax() {
        return maleMax;
    }
    
    /**
     * 여성 최대 수용 인원
     */
    public Integer getFemaleMax() {
        return femaleMax;
    }
    
    /**
     * 라운드 정보 설정
     */
    public void setCurrentRound(RoundInfo roundInfo) {
        this.currentRound = roundInfo;
    }
    
    /**
     * 참가자의 OpenVidu 토큰 설정
     */
    public void setParticipantToken(Long userId, String token) {
        ParticipantState participant = participants.get(userId);
        if (participant != null) {
            participant.setOpenViduToken(token);
        }
    }
    
    /**
     * 방이 비어있는지 확인
     */
    public boolean isEmpty() {
        return participants.isEmpty();
    }
    
    /**
     * PAIR_ONLY 모드 여부
     */
    public boolean isPairMode() {
        return mode == RotationMode.PAIR_ONLY;
    }
    
    /**
     * 라운드 진행 중인지 확인
     */
    public boolean isRoundActive() {
        return currentRound != null;
    }
    
    // ========== 8단계 로테이션 메서드 ==========
    
    /**
     * 스테이지 변경
     */
    public void setCurrentStage(Stage stage) {
        this.currentStage = stage;
    }
    
    /**
     * 스테이지 타이머 설정
     */
    public void setStageTimer(ScheduledFuture<?> timer) {
        // 이전 타이머가 있으면 취소
        if (this.stageTimer != null && !this.stageTimer.isDone()) {
            this.stageTimer.cancel(false);
        }
        this.stageTimer = timer;
    }
    
    /**
     * 투표 제출
     * @param voterId 투표자 사용자 ID
     * @param targetId 투표 대상 사용자 ID (null인 경우 기권/미선택)
     * @param isFinal true: 최종 투표, false: 첫인상 투표
     */
    public void submitVote(Long voterId, Long targetId, boolean isFinal) {
        // ConcurrentHashMap은 value에 null을 허용하지 않으므로 -1L로 대체
        Long storedTargetId = (targetId == null) ? -1L : targetId;
        
        if (isFinal) {
            finalVotes.put(voterId, storedTargetId);
        } else {
            firstVotes.put(voterId, storedTargetId);
        }
    }
    
    /**
     * 첫인상 투표 완료 인원 수 조회
     */
    public int getFirstVotesCount() {
        return firstVotes.size();
    }
    
    /**
     * 최종 투표 완료 인원 수 조회
     */
    public int getFinalVotesCount() {
        return finalVotes.size();
    }
    
    /**
     * 게임 투표 제출
     * @param questionNumber 문제 번호
     * @param voterId 투표자 ID
     * @param targetUserId 투표 대상 ID
     */
    public void submitGameVote(int questionNumber, Long voterId, Long targetUserId) {
        gameVotes.computeIfAbsent(questionNumber, k -> new ConcurrentHashMap<>())
                 .put(voterId, targetUserId);
    }
    
    /**
     * 특정 문제의 투표 데이터 조회
     * @param questionNumber 문제 번호
     * @return voterId -> targetUserId 맵
     */
    public Map<Long, Long> getVotesForQuestion(int questionNumber) {
        return gameVotes.getOrDefault(questionNumber, Collections.emptyMap());
    }
    
    /**
     * 특정 문제의 투표 결과 집계
     * @param questionNumber 문제 번호
     * @return targetUserId -> voteCount 맵 (득표수 순)
     */
    public Map<Long, Integer> calculateGameResults(int questionNumber) {
        Map<Long, Long> votes = getVotesForQuestion(questionNumber);
        Map<Long, Integer> voteCounts = new HashMap<>();
        
        // 득표수 집계
        for (Long targetUserId : votes.values()) {
            voteCounts.put(targetUserId, voteCounts.getOrDefault(targetUserId, 0) + 1);
        }
        
        return voteCounts;
    }
    
    /**
     * 현재 게임 문제 번호 설정
     */
    public void setCurrentGameQuestion(int questionNumber) {
        this.currentGameQuestion = questionNumber;
    }
    
    /**
     * 현재 게임 문제 번호 조회
     */
    public int getCurrentGameQuestion() {
        return currentGameQuestion;
    }
    
    /**
     * 게임 답변 제출 (뱃지 부여) - DEPRECATED
     * @deprecated Use submitGameVote() instead
     */
    @Deprecated
    public void submitGameAnswer(Long userId, String badge) {
        gameBadges.put(userId, badge);
    }
    
    /**
     * 발언자 큐 초기화 (자기소개 시작 시)
     */
    public void initializeSpeakerQueue() {
        speakerQueue.clear();
        speakerQueue.addAll(participants.keySet());
        // 랜덤하게 섞기
        List<Long> userIds = new ArrayList<>(speakerQueue);
        Collections.shuffle(userIds);
        speakerQueue = new LinkedList<>(userIds);
    }
    
    /**
     * 다음 발언자 지정
     * @return 다음 발언자 ID, 없으면 null
     */
    public Long assignNextSpeaker() {
        currentSpeakerId = speakerQueue.poll();
        return currentSpeakerId;
    }
    
    /**
     * 남은 발언자 수
     */
    public int getRemainingspeakers() {
        return speakerQueue.size();
    }
    
    /**
     * 다음 스테이지로 전환
     * @return 다음 스테이지, 마지막 단계인 경우 null
     */
    public Stage moveToNextStage() {
        Stage nextStage = currentStage.getNextStage();
        if (nextStage != null) {
            this.currentStage = nextStage;
        }
        return nextStage;
    }
    
    /**
     * 매칭 결과 계산 (쌍방 선택 확인)
     * @return 매칭 성공한 커플 리스트
     */
    public List<MatchPair> calculateMatches() {
        List<MatchPair> matches = new ArrayList<>();
        Set<Long> processed = new HashSet<>();
        
        for (Map.Entry<Long, Long> entry : finalVotes.entrySet()) {
            Long userId = entry.getKey();
            Long targetId = entry.getValue();
            
            // 이미 처리된 사용자는 스킵
            if (processed.contains(userId)) {
                continue;
            }
            
            // 상대방도 나를 선택했는지 확인 (쌍방 매칭)
            Long targetChoice = finalVotes.get(targetId);
            if (targetChoice != null && targetChoice.equals(userId)) {
                // 매칭 성공!
                String nickname1 = getParticipant(userId)
                        .map(ParticipantState::getNickname)
                        .orElse("Unknown");
                String nickname2 = getParticipant(targetId)
                        .map(ParticipantState::getNickname)
                        .orElse("Unknown");
                
                matches.add(new MatchPair(userId, targetId, nickname1, nickname2, true));
                processed.add(userId);
                processed.add(targetId);
            }
        }
        
        // 매칭 결과 저장
        this.matchedCouples = matches;
        
        return matches;
    }
    
    /**
     * 저장된 매칭 결과 조회
     */
    public List<MatchPair> getMatchedCouples() {
        return new ArrayList<>(matchedCouples);
    }
    
    /**
     * 특정 사용자의 매칭 결과 조회
     */
    public MatchPair getMatchResultForUser(Long userId) {
        List<MatchPair> matches = calculateMatches();
        
        // 매칭 성공한 경우
        for (MatchPair pair : matches) {
            if (pair.getUserId1().equals(userId)) {
                return new MatchPair(
                    userId, 
                    pair.getUserId2(), 
                    pair.getNickname1(), 
                    pair.getNickname2(), 
                    true
                );
            }
            if (pair.getUserId2().equals(userId)) {
                return new MatchPair(
                    userId, 
                    pair.getUserId1(), 
                    pair.getNickname2(), 
                    pair.getNickname1(), 
                    true
                );
            }
        }
        
        // 매칭 실패
        String nickname = getParticipant(userId)
                .map(ParticipantState::getNickname)
                .orElse("Unknown");
        return new MatchPair(userId, null, nickname, null, false);
    }
    
    /**
     * Stage 기반 로테이션 모드 여부
     * (향후 RotationMode에 STAGE_BASED 추가 시 사용)
     */
    public boolean isStageBasedRotation() {
        // 현재는 currentStage가 WAITING이 아니면 Stage 기반으로 간주
        return currentStage != Stage.WAITING;
    }
    
    /**
     * 방 정리 (게임, 투표 데이터 초기화)
     */
    public void clearStageData() {
        firstVotes.clear();
        finalVotes.clear();
        gameBadges.clear();
        speakerQueue.clear();
        currentSpeakerId = null;
        currentGameQuestionId = null;
        
        if (stageTimer != null && !stageTimer.isDone()) {
            stageTimer.cancel(false);
            stageTimer = null;
        }
    }
    
    /**
     * 매칭 결과 DTO
     */
    @Getter
    @ToString
    public static class MatchPair {
        private final Long userId1;
        private final Long userId2;
        private final String nickname1;
        private final String nickname2;
        private final boolean isMatched;
        
        public MatchPair(Long userId1, Long userId2, String nickname1, String nickname2, boolean isMatched) {
            this.userId1 = userId1;
            this.userId2 = userId2;
            this.nickname1 = nickname1;
            this.nickname2 = nickname2;
            this.isMatched = isMatched;
        }
        
        public Long getPartnerId(Long myId) {
            if (myId.equals(userId1)) {
                return userId2;
            }
            if (myId.equals(userId2)) {
                return userId1;
            }
            return null;
        }
        
        public String getPartnerNickname(Long myId) {
            if (myId.equals(userId1)) {
                return nickname2;
            }
            if (myId.equals(userId2)) {
                return nickname1;
            }
            return null;
        }
    }
    
    /**
     * 현재 페어링 정보 설정 (로테이션 시작 시)
     */
    public void setCurrentPairing(Map<Long, Long> pairMap) {
        this.currentPairing.clear();
        if (pairMap != null) {
            this.currentPairing.putAll(pairMap);
        }
    }
    
    /**
     * 특정 사용자의 파트너 ID 조회
     */
    public Long getPartnerId(Long userId) {
        return currentPairing.get(userId);
    }
    
    
    /**
     * 방 정리 시 페어링 정보도 초기화
     */
    public void clearPairing() {
        currentPairing.clear();
    }
    
    // ==================================================================
    // 재연결 관련 메서드
    // ==================================================================
    
    /**
     * 참가자를 연결 해제 상태로 표시
     */
    public void markDisconnected(Long userId) {
        disconnectedParticipants.put(userId, System.currentTimeMillis());
    }
    
    /**
     * 연결 해제 표시 제거 (재연결 성공)
     */
    public void clearDisconnected(Long userId) {
        disconnectedParticipants.remove(userId);
    }
    
    /**
     * 사용자가 유예 기간 내에 있는지 확인
     * 
     * @param userId 사용자 ID
     * @param gracePeriodMs 유예 기간 (밀리초)
     * @return 유예 기간 내이면 true
     */
    public boolean isInGracePeriod(Long userId, long gracePeriodMs) {
        Long disconnectTime = disconnectedParticipants.get(userId);
        if (disconnectTime == null) {
            return false;
        }
        
        long elapsedTime = System.currentTimeMillis() - disconnectTime;
        return elapsedTime < gracePeriodMs;
    }
    
    /**
     * 사용자의 파트너 ID 조회 (currentPairing 사용)
     * 
     * @param userId 사용자 ID
     * @return 파트너 ID, 없으면 null
     */
    public Long getPartner(Long userId) {
        return currentPairing.get(userId);
    }
    
    /**
     * 참가자의 세션 업데이트 (재연결 시)
     * 
     * @param userId 사용자 ID
     * @param newSession 새 WebSocket 세션
     */
    public void updateParticipantSession(Long userId, WebSocketSession newSession) {
        ParticipantState participant = participants.get(userId);
        if (participant != null) {
            participant.updateSession(newSession);
        }
    }
    
    // ==================================================================
    // 방 초기화 및 정리 메서드
    // ==================================================================
    
    /**
     * 방 완전 초기화 (소개팅 종료 후 재사용 준비)
     */
    public void reset() {
        this.currentStage = Stage.WAITING;
        this.participants.clear();
        this.maleCount = 0;
        this.femaleCount = 0;
        this.matchedCouples.clear();
        clearStageData();
        clearPairing();
    }
    
    /**
     * 매칭 실패한(싱글) 사용자 ID 목록 조회
     */
    public List<Long> getSingleUsers() {
        Set<Long> matchedUserIds = new HashSet<>();
        for (MatchPair pair : matchedCouples) {
            matchedUserIds.add(pair.getUserId1());
            matchedUserIds.add(pair.getUserId2());
        }
        
        return participants.keySet().stream()
            .filter(userId -> !matchedUserIds.contains(userId))
            .collect(Collectors.toList());
    }
}
