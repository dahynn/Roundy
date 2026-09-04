package com.ssafya701.roundy.webrtc.controller;

import com.ssafya701.roundy.webrtc.room.ParticipantState;
import com.ssafya701.roundy.webrtc.room.RoomRegistry;
import com.ssafya701.roundy.webrtc.room.RoomState;
import com.ssafya701.roundy.webrtc.room.enums.RotationMode;
import com.ssafya701.roundy.webrtc.room.enums.Gender;
import com.ssafya701.roundy.webrtc.rotation.PairingStrategy;
import com.ssafya701.roundy.webrtc.rotation.RotationScheduler;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketExtension;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.security.Principal;
import java.util.*;

/**
 * Mock WebSocket 세션 구현
 */
class MockWebSocketSession implements WebSocketSession {
    private final String id;
    private boolean open = true;
    
    public MockWebSocketSession(String id) {
        this.id = id;
    }
    
    @Override
    public String getId() {
        return id;
    }
    
    @Override
    public boolean isOpen() {
        return open;
    }
    
    @Override
    public void close() throws IOException {
        open = false;
    }
    
    @Override
    public void close(CloseStatus status) throws IOException {
        open = false;
    }
    
    // 나머지 메서드들은 기본 구현 또는 미지원
    @Override
    public URI getUri() {
        return null;
    }
    
    @Override
    public Map<String, Object> getAttributes() {
        return new HashMap<>();
    }
    
    @Override
    public Principal getPrincipal() {
        return null;
    }
    
    @Override
    public InetSocketAddress getLocalAddress() {
        return null;
    }
    
    @Override
    public InetSocketAddress getRemoteAddress() {
        return null;
    }
    
    @Override
    public String getAcceptedProtocol() {
        return null;
    }
    
    @Override
    public void setTextMessageSizeLimit(int messageSizeLimit) {
    }
    
    @Override
    public int getTextMessageSizeLimit() {
        return 0;
    }
    
    @Override
    public void setBinaryMessageSizeLimit(int messageSizeLimit) {
    }
    
    @Override
    public int getBinaryMessageSizeLimit() {
        return 0;
    }
    
    @Override
    public List<WebSocketExtension> getExtensions() {
        return Collections.emptyList();
    }
    
    @Override
    public void sendMessage(WebSocketMessage<?> message) throws IOException {
        // 테스트용이므로 실제로는 전송하지 않음
    }
    
    @Override
    public org.springframework.http.HttpHeaders getHandshakeHeaders() {
        return new org.springframework.http.HttpHeaders();
    }
}

/**
 * Rotation 기능 테스트용 REST API 컨트롤러
 * 
 * ===== 프로덕션 배포 시 필수 수정 사항 =====
 * 
 * 1. 프로파일 제한 추가 (가장 중요!)
 *    @Profile({"local", "dev", "test"})  // prod 프로파일에서는 자동으로 비활성화
 *    또는
 *    @Profile("!prod")  // prod가 아닐 때만 활성화
 * 
 * 2. IP 제한 (선택사항)
 *    - 내부 네트워크에서만 접근 가능하도록 설정
 *    - Security Config에서 /api/test/** 경로를 특정 IP만 허용
 * 
 * 3. 인증/인가 추가 (선택사항)
 *    - Admin 권한을 가진 사용자만 접근 가능하도록
 *    - @PreAuthorize("hasRole('ADMIN')") 추가
 * 
 * 4. Rate Limiting (선택사항)
 *    - 과도한 요청을 막기 위한 제한
 *    - @RateLimiter 또는 Bucket4j 사용
 * 
 * 5. 로깅 레벨 조정
 *    - 민감한 정보가 로그에 노출되지 않도록 주의
 * 
 * 6. 에러 메시지 수정
 *    - 내부 구현 세부사항이 외부에 노출되지 않도록
 * 
 * ===== 권장 배포 방식 =====
 * 
 * Option 1: 프로파일로 완전 비활성화 (가장 안전)
 *   @Profile("!prod")
 *   public class RotationTestController { ... }
 * 
 * Option 2: Admin 전용 API로 전환
 *   @PreAuthorize("hasRole('ADMIN')")
 *   public class RotationTestController { ... }
 * 
 * Option 3: 완전 삭제
 *   - 프로덕션 빌드 시 이 파일을 제외
 *   - Gradle: sourceSets에서 test controller 제외
 * 
 * 테스트 방법:
 * 1. 페어링 알고리즘 테스트: GET /api/test/rotation/pairing/{participantCount}?round={roundNumber}
 * 2. 라운드 수 계산 테스트: GET /api/test/rotation/rounds/{participantCount}
 * 3. 로테이션 시작 테스트: POST /api/test/rotation/start
 * 4. 로테이션 중지 테스트: POST /api/test/rotation/stop/{roomId}
 * 5. 로테이션 상태 확인: GET /api/test/rotation/status/{roomId}
 */
@Slf4j
@RestController
@RequestMapping("/api/test/rotation")
@Profile({"local", "dev"})
@RequiredArgsConstructor
public class RotationTestController {
    
    private final RotationScheduler rotationScheduler;
    private final RoomRegistry roomRegistry;
    private final PairingStrategy pairingStrategy = new PairingStrategy();
    
    /**
     * 페어링 알고리즘 테스트
     * GET /api/test/rotation/pairing/4?round=1
     * 
     * TODO: [배포 시 고려사항]
     * 1. 입력값 검증 강화: participantCount는 2~100 사이로 제한
     * 2. Rate Limiting: 초당 최대 10회 요청으로 제한
     */
    @GetMapping("/pairing/{participantCount}")
    public PairingTestResult testPairing(
            @PathVariable int participantCount,
            @RequestParam(defaultValue = "1") int round) {
        
        // TODO: [배포 시] 입력값 검증 추가
        // if (participantCount < 2 || participantCount > 100) {
        //     throw new IllegalArgumentException("참가자 수는 2~100 사이여야 합니다.");
        // }
        
        log.info("페어링 테스트 시작: {} 명, 라운드 {}", participantCount, round);
        
        // Mock 참가자 생성
        List<ParticipantState> participants = createMockParticipants(participantCount);
        
        // 페어링 계산
        List<PairingStrategy.Pair> pairs = pairingStrategy.calculatePairs(participants, round, false);
        
        // 결과 변환
        List<PairResult> pairResults = new ArrayList<>();
        for (PairingStrategy.Pair pair : pairs) {
            pairResults.add(new PairResult(
                pair.getUserId1(),
                pair.getUserId2(),
                pair.isSingle()
            ));
        }
        
        return new PairingTestResult(
            participantCount,
            round,
            pairs.size(),
            pairResults
        );
    }
    
    /**
     * 총 라운드 수 계산 테스트
     * GET /api/test/rotation/rounds/5
     */
    @GetMapping("/rounds/{participantCount}")
    public RoundCalculationResult testRoundCalculation(@PathVariable int participantCount) {
        log.info("라운드 수 계산 테스트: {} 명", participantCount);
        
        int totalRounds = pairingStrategy.calculateTotalRounds(participantCount);
        
        return new RoundCalculationResult(
            participantCount,
            totalRounds,
            participantCount % 2 == 0 ? "짝수" : "홀수"
        );
    }
    
    /**
     * 전체 라운드 페어링 시뮬레이션
     * GET /api/test/rotation/simulate/4
     */
    @GetMapping("/simulate/{participantCount}")
    public SimulationResult simulateAllRounds(@PathVariable int participantCount) {
        log.info("전체 라운드 시뮬레이션: {} 명", participantCount);
        
        List<ParticipantState> participants = createMockParticipants(participantCount);
        int totalRounds = pairingStrategy.calculateTotalRounds(participantCount);
        
        Map<Integer, List<PairResult>> allRounds = new LinkedHashMap<>();
        Set<String> allCombinations = new HashSet<>();
        
        for (int round = 1; round <= totalRounds; round++) {
            List<PairingStrategy.Pair> pairs = pairingStrategy.calculatePairs(participants, round, false);
            List<PairResult> pairResults = new ArrayList<>();
            
            for (PairingStrategy.Pair pair : pairs) {
                pairResults.add(new PairResult(
                    pair.getUserId1(),
                    pair.getUserId2(),
                    pair.isSingle()
                ));
                
                // 조합 기록
                if (!pair.isSingle()) {
                    long min = Math.min(pair.getUserId1(), pair.getUserId2());
                    long max = Math.max(pair.getUserId1(), pair.getUserId2());
                    allCombinations.add(min + "-" + max);
                }
            }
            
            allRounds.put(round, pairResults);
        }
        
        return new SimulationResult(
            participantCount,
            totalRounds,
            allCombinations.size(),
            allRounds
        );
    }
    
    /**
     * 로테이션 시작 테스트
     * POST /api/test/rotation/start
     * Body: { "roomId": "test-room", "mode": "PAIR_ONLY", "participantCount": 4, "totalRounds": 3 }
     * 
     * TODO: [배포 시 보안 위험!]
     * 1. 이 API는 실제 방을 생성하고 메모리/스레드를 사용함
     * 2. 악의적 사용자가 수많은 방을 생성하여 서버 자원을 고갈시킬 수 있음
     * 3. 반드시 인증된 관리자만 접근 가능하도록 제한 필요
     * 4. 또는 프로덕션에서는 완전히 비활성화
     */
    @PostMapping("/start")
    // TODO: [배포 전 필수] 주석 해제하여 Admin만 접근 가능
    // @PreAuthorize("hasRole('ADMIN')")
    public RotationStartResult startRotationTest(@RequestBody RotationStartRequest request) {
        // TODO: [배포 시] 민감한 정보 로깅 제거
        log.info("로테이션 시작 테스트: roomId={}, mode={}, 참가자 {}명", 
                request.getRoomId(), request.getMode(), request.getParticipantCount());
        
        // 방 생성 또는 조회
        RoomState room = roomRegistry.getOrCreateRoom(
            request.getRoomId(),
            request.getMode(),
            "openvidu-session-" + request.getRoomId()
        );
        
        // Mock 참가자 추가 (남녀 교대 배정)
        for (int i = 1; i <= request.getParticipantCount(); i++) {
            WebSocketSession mockSession = new MockWebSocketSession("session-" + i);
            Gender gender = (i % 2 == 1) ? Gender.MALE : Gender.FEMALE;  // 홀수: 남성, 짝수: 여성
            room.addParticipant((long) i, "User" + i, gender, mockSession);
        }
        
        // 로테이션 시작
        rotationScheduler.startRotation(room, request.getTotalRounds());
        
        return new RotationStartResult(
            request.getRoomId(),
            room.getParticipantCount(),
            room.getCurrentRound() != null ? room.getCurrentRound().getCurrentRound() : 0,
            room.getCurrentRound() != null ? room.getCurrentRound().getTotalRounds() : 0,
            rotationScheduler.isRotationActive(request.getRoomId()),
            "로테이션이 시작되었습니다. 실시간 이벤트는 WebSocket을 통해 발행됩니다."
        );
    }
    
    /**
     * 로테이션 중지 테스트
     * POST /api/test/rotation/stop/{roomId}
     */
    @PostMapping("/stop/{roomId}")
    public Map<String, Object> stopRotationTest(@PathVariable String roomId) {
        log.info("로테이션 중지 테스트: roomId={}", roomId);
        
        boolean wasActive = rotationScheduler.isRotationActive(roomId);
        rotationScheduler.stopRotation(roomId);
        
        Map<String, Object> result = new HashMap<>();
        result.put("roomId", roomId);
        result.put("wasActive", wasActive);
        result.put("isActive", rotationScheduler.isRotationActive(roomId));
        result.put("message", wasActive ? "로테이션이 중지되었습니다." : "활성화된 로테이션이 없었습니다.");
        
        return result;
    }
    
    /**
     * 로테이션 상태 확인
     * GET /api/test/rotation/status/{roomId}
     */
    @GetMapping("/status/{roomId}")
    public Map<String, Object> getRotationStatus(@PathVariable String roomId) {
        log.info("로테이션 상태 확인: roomId={}", roomId);
        
        Optional<RoomState> roomOpt = roomRegistry.getRoom(roomId);
        
        Map<String, Object> result = new HashMap<>();
        result.put("roomId", roomId);
        result.put("roomExists", roomOpt.isPresent());
        result.put("isRotationActive", rotationScheduler.isRotationActive(roomId));
        
        if (roomOpt.isPresent()) {
            RoomState room = roomOpt.get();
            result.put("participantCount", room.getParticipantCount());
            result.put("mode", room.getMode());
            
            if (room.getCurrentRound() != null) {
                result.put("currentRound", room.getCurrentRound().getCurrentRound());
                result.put("totalRounds", room.getCurrentRound().getTotalRounds());
                result.put("durationSeconds", room.getCurrentRound().getDurationSeconds());
            }
        }
        
        return result;
    }
    
    /**
     * 모든 테스트 방 정리
     * DELETE /api/test/rotation/cleanup
     * 
     * TODO: [배포 시 매우 위험!]
     * 1. 이 API는 모든 방을 강제로 삭제함
     * 2. 실제 운영 중인 방까지 삭제될 수 있음
     * 3. 프로덕션에서는 절대 사용하면 안됨
     * 4. 반드시 @Profile("!prod")로 비활성화 필요
     */
    @DeleteMapping("/cleanup")
    // TODO: [배포 전 필수] 주석 해제하여 Admin만 접근 가능
    // @PreAuthorize("hasRole('SUPER_ADMIN')")
    public Map<String, Object> cleanup() {
        log.warn("⚠️ 테스트 방 정리 시작 - 모든 방이 삭제됩니다!");
        
        // 모든 로테이션 중지
        Collection<RoomState> allRooms = roomRegistry.getAllRooms();
        for (RoomState room : allRooms) {
            rotationScheduler.stopRotation(room.getRoomId());
        }
        
        // 모든 방 삭제
        roomRegistry.clear();
        
        Map<String, Object> result = new HashMap<>();
        result.put("message", "모든 테스트 방이 정리되었습니다.");
        result.put("cleanedRoomCount", allRooms.size());
        
        return result;
    }
    
    // ===== Helper Methods =====
    
    private List<ParticipantState> createMockParticipants(int count) {
        List<ParticipantState> participants = new ArrayList<>();
        
        for (int i = 1; i <= count; i++) {
            WebSocketSession mockSession = new MockWebSocketSession("session-" + i);
            Gender gender = (i % 2 == 1) ? Gender.MALE : Gender.FEMALE;  // 홀수: 남성, 짝수: 여성
            
            participants.add(new ParticipantState(
                (long) i,
                "User" + i,
                gender,
                mockSession,
                null
            ));
        }
        
        return participants;
    }
    
    // ===== Response DTOs =====
    
    @Getter
    @AllArgsConstructor
    static class PairingTestResult {
        private int participantCount;
        private int roundNumber;
        private int pairCount;
        private List<PairResult> pairs;
    }
    
    @Getter
    @AllArgsConstructor
    static class PairResult {
        private Long userId1;
        private Long userId2;
        private boolean isSingle;
    }
    
    @Getter
    @AllArgsConstructor
    static class RoundCalculationResult {
        private int participantCount;
        private int totalRounds;
        private String type;
    }
    
    @Getter
    @AllArgsConstructor
    static class SimulationResult {
        private int participantCount;
        private int totalRounds;
        private int uniqueCombinations;
        private Map<Integer, List<PairResult>> allRounds;
    }
    
    @Getter
    @AllArgsConstructor
    static class RotationStartResult {
        private String roomId;
        private int participantCount;
        private int currentRound;
        private int totalRounds;
        private boolean isActive;
        private String message;
    }
    
    @Getter
    static class RotationStartRequest {
        private String roomId;
        private RotationMode mode;
        private int participantCount;
        private Integer totalRounds;
    }
}
