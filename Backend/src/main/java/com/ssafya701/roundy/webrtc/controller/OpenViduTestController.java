package com.ssafya701.roundy.webrtc.controller;

import com.ssafya701.roundy.global.common.CommonResponse;
import com.ssafya701.roundy.webrtc.openvidu.OpenViduService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * OpenVidu 연동 테스트용 컨트롤러
 * 실제 프로덕션에서는 제거 필요
 */
@Slf4j
@RestController
@RequestMapping("/api/test/openvidu")
@RequiredArgsConstructor
public class OpenViduTestController {

    private final OpenViduService openViduService;

    /**
     * Session 생성 테스트
     * 
     * GET /api/test/openvidu/session?roomId=test-room-1
     */
    @GetMapping("/session")
    public CommonResponse<?> testCreateSession(
            @RequestParam String roomId
    ) {
        log.info("Session 생성 테스트: roomId={}", roomId);
        
        try {
            String sessionId = openViduService.ensureSession(roomId);
            String openviduUrl = openViduService.getOpenViduUrl();
            
            return CommonResponse.ofSuccess(Map.of(
                "roomId", roomId,
                "sessionId", sessionId,
                "openviduUrl", openviduUrl,
                "message", "Session 생성 성공"
            ));
        } catch (Exception e) {
            log.error("Session 생성 실패", e);
            return CommonResponse.ofFailure("Session 생성 실패: " + e.getMessage());
        }
    }

    /**
     * Token 발급 테스트
     * 
     * GET /api/test/openvidu/token?roomId=test-room-1&userId=1001
     */
    @GetMapping("/token")
    public CommonResponse<?> testGenerateToken(
            @RequestParam String roomId,
            @RequestParam Long userId
    ) {
        log.info("Token 발급 테스트: roomId={}, userId={}", roomId, userId);
        
        try {
            // Session이 없으면 먼저 생성
            String sessionId = openViduService.ensureSession(roomId);
            
            // Token 발급
            String token = openViduService.generateToken(roomId, userId);
            
            return CommonResponse.ofSuccess(Map.of(
                "roomId", roomId,
                "userId", userId.toString(),
                "sessionId", sessionId,
                "token", token,
                "message", "Token 발급 성공"
            ));
        } catch (Exception e) {
            log.error("Token 발급 실패", e);
            return CommonResponse.ofFailure("Token 발급 실패: " + e.getMessage());
        }
    }

    /**
     * Session 제거 테스트
     * 
     * DELETE /api/test/openvidu/session?roomId=test-room-1
     */
    @DeleteMapping("/session")
    public CommonResponse<?> testRemoveSession(
            @RequestParam String roomId
    ) {
        log.info("Session 제거 테스트: roomId={}", roomId);
        
        try {
            openViduService.removeSession(roomId);
            
            return CommonResponse.ofSuccess(Map.of(
                "roomId", roomId,
                "message", "Session 제거 성공"
            ));
        } catch (Exception e) {
            log.error("Session 제거 실패", e);
            return CommonResponse.ofFailure("Session 제거 실패: " + e.getMessage());
        }
    }

    /**
     * 전체 플로우 테스트 (Session 생성 → Token 발급 → Session 제거)
     * 
     * POST /api/test/openvidu/full-flow
     */
    @PostMapping("/full-flow")
    public CommonResponse<?> testFullFlow(
            @RequestBody Map<String, Object> request
    ) {
        String roomId = (String) request.get("roomId");
        Long userId1 = Long.valueOf(request.get("userId1").toString());
        Long userId2 = Long.valueOf(request.get("userId2").toString());
        
        log.info("전체 플로우 테스트: roomId={}, userId1={}, userId2={}", roomId, userId1, userId2);
        
        try {
            // 1. Session 생성
            String sessionId = openViduService.ensureSession(roomId);
            
            // 2. 두 명의 사용자에게 Token 발급
            String token1 = openViduService.generateToken(roomId, userId1);
            String token2 = openViduService.generateToken(roomId, userId2);
            
            // 3. Session 정보 확인 (캐시 확인)
            String cachedSessionId = openViduService.ensureSession(roomId);
            
            return CommonResponse.ofSuccess(Map.of(
                "roomId", roomId,
                "sessionId", sessionId,
                "cachedSessionId", cachedSessionId,
                "sessionMatches", sessionId.equals(cachedSessionId),
                "user1", Map.of("userId", userId1, "token", token1),
                "user2", Map.of("userId", userId2, "token", token2),
                "message", "전체 플로우 테스트 성공"
            ));
        } catch (Exception e) {
            log.error("전체 플로우 테스트 실패", e);
            return CommonResponse.ofFailure("전체 플로우 테스트 실패: " + e.getMessage());
        }
    }
}
