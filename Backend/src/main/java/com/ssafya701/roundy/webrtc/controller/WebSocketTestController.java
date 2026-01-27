package com.ssafya701.roundy.webrtc.controller;

import com.ssafya701.roundy.webrtc.room.RoomRegistry;
import com.ssafya701.roundy.webrtc.room.RoomState;
import com.ssafya701.roundy.webrtc.service.JwtService;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

/**
 * WebSocket 테스트용 REST API 컨트롤러
 * 개발 및 테스트 환경에서 WebSocket 연결을 테스트하기 위한 유틸리티 API 제공
 * 
 * WARN: 이 컨트롤러는 테스트 전용입니다. 운영 환경에서는 반드시 비활성화해야 합니다.
 */
@Slf4j
@RestController
@RequestMapping("/api/webrtc/test")
// TODO: [운영 환경] @Profile({"dev", "local"}) 추가하여 운영에서 비활성화
@CrossOrigin(origins = "*", allowedHeaders = "*") // TODO: [운영 환경] 제거 또는 특정 도메인으로 제한
@RequiredArgsConstructor
public class WebSocketTestController {

    private final JwtService jwtService;
    private final RoomRegistry roomRegistry;

    @Value("${server.port:8080}")
    private int serverPort;

    /**
     * JWT 토큰 발급 (테스트용)
     * 실제 운영 환경에서는 사용자 인증 후 토큰을 발급해야 함
     * 
     * POST /api/webrtc/test/token
     * Request Body: {"userId": 1, "username": "testUser"}
     */
    @PostMapping("/token")
    public ResponseEntity<TokenResponse> generateToken(@RequestBody TokenRequest request) {
        log.info("JWT 토큰 발급 요청: userId={}, username={}", request.getUserId(), request.getUsername());

        // TODO: [브랜치 병합] 실제 인증 서비스와 통합
        // User user = userService.findById(request.getUserId())
        //     .orElseThrow(() -> new UserNotFoundException(request.getUserId()));
        // String token = authService.createAccessToken(user.getId(), user.getUsername());
        
        String token = jwtService.generateTempToken(request.getUserId(), request.getUsername());

        TokenResponse response = new TokenResponse(
                token,
                request.getUserId(),
                request.getUsername(),
                "ws://localhost:" + serverPort + "/ws/webrtc"
        );

        log.info("JWT 토큰 발급 완료: userId={}", request.getUserId());
        return ResponseEntity.ok(response);
    }

    /**
     * WebSocket 연결 가이드 조회
     * 
     * GET /api/webrtc/test/guide
     */
    @GetMapping("/guide")
    public ResponseEntity<Map<String, Object>> getConnectionGuide() {
        Map<String, Object> guide = new HashMap<>();
        
        guide.put("step1", "POST /api/webrtc/test/token 호출하여 JWT 토큰 발급");
        guide.put("step2", "WebSocket 연결: ws://localhost:" + serverPort + "/ws/webrtc?token={발급받은토큰}");
        guide.put("step3", "JOIN_ROOM 메시지 전송: {\"type\":\"JOIN_ROOM\",\"roomId\":\"room-123\"}");
        guide.put("step4", "JOIN_OK 및 ROOM_STATE 메시지 수신 확인");
        guide.put("step5", "LEAVE_ROOM 메시지 전송: {\"type\":\"LEAVE_ROOM\",\"roomId\":\"room-123\"}");
        
        Map<String, String> examples = new HashMap<>();
        examples.put("tokenRequest", "{\"userId\": 1, \"username\": \"testUser\"}");
        examples.put("joinRoom", "{\"type\":\"JOIN_ROOM\",\"roomId\":\"room-123\"}");
        examples.put("leaveRoom", "{\"type\":\"LEAVE_ROOM\",\"roomId\":\"room-123\"}");
        guide.put("examples", examples);

        return ResponseEntity.ok(guide);
    }

    /**
     * 현재 활성 방 목록 조회
     * 
     * GET /api/webrtc/test/rooms
     */
    @GetMapping("/rooms")
    public ResponseEntity<RoomsResponse> getRooms() {
        // TODO: [브랜치 병합] DB Room 엔티티와 동기화
        // List<Room> dbRooms = roomService.findAllActiveRooms();
        // RoomRegistry와 DB 상태 비교 로직 추가
        
        Collection<RoomState> rooms = roomRegistry.getAllRooms();
        
        RoomsResponse response = new RoomsResponse(
                rooms.size(),
                rooms.stream()
                        .map(room -> new RoomInfoDto(
                                room.getRoomId(),
                                room.getParticipantCount(),
                                room.getMode().name(),
                                room.isRoundActive()
                        ))
                        .toList()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * 특정 방 상태 조회
     * 
     * GET /api/webrtc/test/rooms/{roomId}
     */
    @GetMapping("/rooms/{roomId}")
    public ResponseEntity<RoomDetailResponse> getRoomDetail(@PathVariable String roomId) {
        return roomRegistry.getRoom(roomId)
                .map(room -> {
                    RoomDetailResponse response = new RoomDetailResponse(
                            room.getRoomId(),
                            room.getParticipantCount(),
                            room.getMode().name(),
                            room.isRoundActive(),
                            room.getParticipantList().stream()
                                    .map(p -> new ParticipantInfoDto(
                                            p.getUserId(),
                                            p.getNickname(),
                                            p.getSessionId()
                                    ))
                                    .toList(),
                            room.getCurrentRound() != null ? new RoundInfoDto(
                                    room.getCurrentRound().getCurrentRound(),
                                    room.getCurrentRound().getTotalRounds(),
                                    room.getCurrentRound().getDurationSeconds()
                            ) : null
                    );
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 모든 방 초기화 (테스트용)
     * 
     * DELETE /api/webrtc/test/rooms
     */
    @DeleteMapping("/rooms")
    public ResponseEntity<Map<String, String>> clearAllRooms() {
        // TODO: [운영 환경] 이 엔드포인트 제거 또는 관리자 권한 체크
        // if (!securityContext.hasRole("ADMIN")) {
        //     throw new AccessDeniedException("관리자 권한 필요");
        // }
        
        log.warn("모든 방 초기화 요청 (테스트용)");
        roomRegistry.clear();
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "모든 방이 초기화되었습니다");
        return ResponseEntity.ok(response);
    }

    // DTO Classes

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TokenRequest {
        private Long userId;
        private String username;
    }

    @Getter
    @AllArgsConstructor
    public static class TokenResponse {
        private String token;
        private Long userId;
        private String username;
        private String websocketUrl;
    }

    @Getter
    @AllArgsConstructor
    public static class RoomsResponse {
        private int totalRooms;
        private Collection<RoomInfoDto> rooms;
    }

    @Getter
    @AllArgsConstructor
    public static class RoomInfoDto {
        private String roomId;
        private int participantCount;
        private String mode;
        private boolean roundActive;
    }

    @Getter
    @AllArgsConstructor
    public static class RoomDetailResponse {
        private String roomId;
        private int participantCount;
        private String mode;
        private boolean roundActive;
        private Collection<ParticipantInfoDto> participants;
        private RoundInfoDto currentRound;
    }

    @Getter
    @AllArgsConstructor
    public static class ParticipantInfoDto {
        private Long userId;
        private String nickname;
        private String sessionId;
    }

    @Getter
    @AllArgsConstructor
    public static class RoundInfoDto {
        private int currentRound;
        private int totalRounds;
        private int durationSeconds;
    }
}
