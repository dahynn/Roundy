package com.ssafya701.roundy.webrtc.controller;

import com.ssafya701.roundy.global.common.CommonResponse;
import com.ssafya701.roundy.webrtc.openvidu.OpenViduService;
import com.ssafya701.roundy.webrtc.room.RoomRegistry;
import com.ssafya701.roundy.webrtc.room.RoomState;
import com.ssafya701.roundy.webrtc.room.enums.RotationMode;
import com.ssafya701.roundy.webrtc.rotation.RoundInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.stream.Collectors;

/**
 * Room State 테스트용 컨트롤러
 * POSTMAN으로 로컬 테스트용
 */
@Slf4j
@RestController
@RequestMapping("/api/test/room")
@RequiredArgsConstructor
public class RoomTestController {

    private final RoomRegistry roomRegistry;
    private final OpenViduService openViduService;

    /**
     * 방 생성 테스트
     * GET /api/test/room/create?roomId=room-001&mode=PAIR_ONLY
     */
    @GetMapping("/create")
    public CommonResponse<?> createRoom(
            @RequestParam String roomId,
            @RequestParam(defaultValue = "FREE_TALK") String mode
    ) {
        log.info("방 생성 테스트: roomId={}, mode={}", roomId, mode);
        
        try {
            RotationMode rotationMode = RotationMode.valueOf(mode);
            
            // [Fix] OpenViduService를 통해 세션 생성 및 캐시 등록 (필수)
            String openViduSessionId = openViduService.ensureSession(roomId);
            
            RoomState room = roomRegistry.getOrCreateRoom(roomId, rotationMode, openViduSessionId);
            
            return CommonResponse.ofSuccess(Map.of(
                "roomId", room.getRoomId(),
                "mode", room.getMode().toString(),
                "openViduSessionId", room.getOpenViduSessionId(),
                "participantCount", room.getParticipantCount(),
                "isEmpty", room.isEmpty(),
                "isPairMode", room.isPairMode(),
                "isRoundActive", room.isRoundActive(),
                "message", "방 생성 성공"
            ));
        } catch (Exception e) {
            log.error("방 생성 실패", e);
            return CommonResponse.ofFailure("방 생성 실패: " + e.getMessage());
        }
    }

    /**
     * 방 조회 테스트
     * GET /api/test/room/info?roomId=room-001
     */
    @GetMapping("/info")
    public CommonResponse<?> getRoomInfo(@RequestParam String roomId) {
        log.info("방 조회 테스트: roomId={}", roomId);
        
        return roomRegistry.getRoom(roomId)
            .<CommonResponse<?>>map(room -> CommonResponse.ofSuccess(Map.of(
                "roomId", room.getRoomId(),
                "mode", room.getMode().toString(),
                "openViduSessionId", room.getOpenViduSessionId(),
                "participantCount", room.getParticipantCount(),
                "isEmpty", room.isEmpty(),
                "isPairMode", room.isPairMode(),
                "isRoundActive", room.isRoundActive(),
                "currentRound", room.getCurrentRound() != null ? Map.of(
                    "currentRound", room.getCurrentRound().getCurrentRound(),
                    "totalRounds", room.getCurrentRound().getTotalRounds(),
                    "durationSeconds", room.getCurrentRound().getDurationSeconds(),
                    "isLastRound", room.getCurrentRound().isLastRound()
                ) : null,
                "participants", room.getParticipantList().stream()
                    .map(p -> Map.of(
                        "userId", p.getUserId(),
                        "nickname", p.getNickname(),
                        "sessionId", p.getSessionId(),
                        "isSessionOpen", p.isSessionOpen()
                    ))
                    .collect(Collectors.toList())
            )))
            .orElseGet(() -> CommonResponse.ofFailure("방을 찾을 수 없습니다: " + roomId));
    }

    /**
     * 전체 방 목록 조회
     * GET /api/test/room/list
     */
    @GetMapping("/list")
    public CommonResponse<?> getAllRooms() {
        log.info("전체 방 목록 조회");
        
        return CommonResponse.ofSuccess(Map.of(
            "totalRooms", roomRegistry.getRoomCount(),
            "rooms", roomRegistry.getAllRooms().stream()
                .map(room -> Map.of(
                    "roomId", room.getRoomId(),
                    "mode", room.getMode().toString(),
                    "participantCount", room.getParticipantCount(),
                    "isEmpty", room.isEmpty(),
                    "isRoundActive", room.isRoundActive()
                ))
                .collect(Collectors.toList())
        ));
    }

    /**
     * 라운드 시작 테스트
     * POST /api/test/room/round/start
     * Body: {"roomId":"room-001","currentRound":1,"totalRounds":5,"durationSeconds":300}
     */
    @PostMapping("/round/start")
    public CommonResponse<?> startRound(@RequestBody Map<String, Object> request) {
        String roomId = (String) request.get("roomId");
        int currentRound = ((Number) request.get("currentRound")).intValue();
        int totalRounds = ((Number) request.get("totalRounds")).intValue();
        int durationSeconds = ((Number) request.get("durationSeconds")).intValue();
        
        log.info("라운드 시작 테스트: roomId={}, round={}/{}", roomId, currentRound, totalRounds);
        
        return roomRegistry.getRoom(roomId)
            .<CommonResponse<?>>map(room -> {
                RoundInfo roundInfo = new RoundInfo(currentRound, totalRounds, durationSeconds);
                room.setCurrentRound(roundInfo);
                
                return CommonResponse.ofSuccess(Map.of(
                    "roomId", roomId,
                    "currentRound", roundInfo.getCurrentRound(),
                    "totalRounds", roundInfo.getTotalRounds(),
                    "durationSeconds", roundInfo.getDurationSeconds(),
                    "isLastRound", roundInfo.isLastRound(),
                    "message", "라운드 시작 성공"
                ));
            })
            .orElseGet(() -> CommonResponse.ofFailure("방을 찾을 수 없습니다: " + roomId));
    }

    /**
     * 다음 라운드로 진행
     * POST /api/test/room/round/next?roomId=room-001
     */
    @PostMapping("/round/next")
    public CommonResponse<?> nextRound(@RequestParam String roomId) {
        log.info("다음 라운드 진행: roomId={}", roomId);
        
        return roomRegistry.getRoom(roomId)
            .<CommonResponse<?>>map(room -> {
                if (room.getCurrentRound() == null) {
                    return CommonResponse.ofFailure("진행 중인 라운드가 없습니다");
                }
                
                RoundInfo nextRound = room.getCurrentRound().nextRound();
                room.setCurrentRound(nextRound);
                
                return CommonResponse.ofSuccess(Map.of(
                    "roomId", roomId,
                    "currentRound", nextRound.getCurrentRound(),
                    "totalRounds", nextRound.getTotalRounds(),
                    "isLastRound", nextRound.isLastRound(),
                    "message", "다음 라운드로 진행"
                ));
            })
            .orElseGet(() -> CommonResponse.ofFailure("방을 찾을 수 없습니다: " + roomId));
    }

    /**
     * 방 삭제 테스트
     * DELETE /api/test/room?roomId=room-001
     */
    @DeleteMapping
    public CommonResponse<?> deleteRoom(@RequestParam String roomId) {
        log.info("방 삭제 테스트: roomId={}", roomId);
        
        if (!roomRegistry.hasRoom(roomId)) {
            return CommonResponse.ofFailure("방을 찾을 수 없습니다: " + roomId);
        }
        
        roomRegistry.removeRoom(roomId);
        return CommonResponse.ofSuccess(Map.of(
            "roomId", roomId,
            "message", "방 삭제 성공"
        ));
    }

    /**
     * 전체 방 정리
     * DELETE /api/test/room/all
     */
    @DeleteMapping("/all")
    public CommonResponse<?> clearAllRooms() {
        log.info("모든 방 정리");
        
        int count = roomRegistry.getRoomCount();
        roomRegistry.clear();
        
        return CommonResponse.ofSuccess(Map.of(
            "clearedRooms", count,
            "remainingRooms", roomRegistry.getRoomCount(),
            "message", "모든 방 정리 완료"
        ));
    }

    /**
     * 전체 플로우 테스트
     * POST /api/test/room/full-flow
     * Body: {"roomId":"room-001","mode":"PAIR_ONLY"}
     */
    @PostMapping("/full-flow")
    public CommonResponse<?> testFullFlow(@RequestBody Map<String, Object> request) {
        String roomId = (String) request.get("roomId");
        String mode = (String) request.getOrDefault("mode", "PAIR_ONLY");
        
        log.info("전체 플로우 테스트: roomId={}, mode={}", roomId, mode);
        
        try {
            // 1. 방 생성
            RotationMode rotationMode = RotationMode.valueOf(mode);
            RoomState room = roomRegistry.getOrCreateRoom(roomId, rotationMode, "openvidu-" + roomId);
            
            // 2. 라운드 시작
            RoundInfo round1 = new RoundInfo(1, 5, 300);
            room.setCurrentRound(round1);
            
            // 3. 다음 라운드
            RoundInfo round2 = round1.nextRound();
            room.setCurrentRound(round2);
            
            // 4. 방 정보 확인
            int participantCount = room.getParticipantCount();
            
            return CommonResponse.ofSuccess(Map.of(
                "step1_create", Map.of(
                    "roomId", room.getRoomId(),
                    "mode", room.getMode().toString(),
                    "created", true
                ),
                "step2_round1", Map.of(
                    "currentRound", round1.getCurrentRound(),
                    "totalRounds", round1.getTotalRounds()
                ),
                "step3_round2", Map.of(
                    "currentRound", round2.getCurrentRound(),
                    "totalRounds", round2.getTotalRounds(),
                    "isLastRound", round2.isLastRound()
                ),
                "step4_info", Map.of(
                    "participantCount", participantCount,
                    "isEmpty", room.isEmpty(),
                    "isRoundActive", room.isRoundActive()
                ),
                "message", "전체 플로우 테스트 성공"
            ));
        } catch (Exception e) {
            log.error("전체 플로우 테스트 실패", e);
            return CommonResponse.ofFailure("전체 플로우 테스트 실패: " + e.getMessage());
        }
    }
}
