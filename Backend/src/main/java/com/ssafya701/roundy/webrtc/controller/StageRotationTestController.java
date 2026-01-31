package com.ssafya701.roundy.webrtc.controller;

import com.ssafya701.roundy.webrtc.room.RoomRegistry;
import com.ssafya701.roundy.webrtc.room.RoomState;
import com.ssafya701.roundy.webrtc.room.enums.Stage;
import com.ssafya701.roundy.webrtc.rotation.StageExecutor;
import com.ssafya701.roundy.webrtc.rotation.StageScheduler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 8단계 로테이션 테스트 컨트롤러
 * Postman 테스트를 위한 수동 시작 API 제공
 */
@Slf4j
@RestController
@RequestMapping("/api/test/stage-rotation")
@RequiredArgsConstructor
public class StageRotationTestController {
    
    private final RoomRegistry roomRegistry;
    private final StageExecutor stageExecutor;
    private final StageScheduler stageScheduler;
    
    /**
     * 8단계 로테이션 수동 시작 (자동 전환 포함)
     * 
     * @param roomId 방 ID
     * @return 시작 결과
     */
    @PostMapping("/start/{roomId}")
    public ResponseEntity<Map<String, Object>> startStageRotation(@PathVariable String roomId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            RoomState room = roomRegistry.getRoom(roomId)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 방입니다: " + roomId));
            
            // 이미 진행 중인지 확인
            if (room.getCurrentStage() != Stage.WAITING) {
                response.put("success", false);
                response.put("message", "이미 로테이션이 진행 중입니다");
                response.put("currentStage", room.getCurrentStage().name());
                return ResponseEntity.badRequest().body(response);
            }
            
            // 최소 인원 확인
            int participantCount = room.getParticipantCount();
            if (participantCount < 2) {
                response.put("success", false);
                response.put("message", "최소 2명 이상의 참가자가 필요합니다");
                response.put("participantCount", participantCount);
                return ResponseEntity.badRequest().body(response);
            }
            
            // 자동 전환 스케줄러 시작
            stageScheduler.startStageRotation(room);
            
            log.info("🎬 8단계 로테이션 수동 시작 (자동 전환): roomId={}, 참가자={}명", roomId, participantCount);
            
            response.put("success", true);
            response.put("message", "8단계 로테이션이 시작되었습니다 (자동 전환 활성화)");
            response.put("roomId", roomId);
            response.put("currentStage", Stage.SELF_INTRO.name());
            response.put("participantCount", participantCount);
            response.put("durationSeconds", Stage.SELF_INTRO.getDurationSeconds());
            response.put("autoTransition", true);
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("8단계 로테이션 시작 실패: roomId={}", roomId, e);
            response.put("success", false);
            response.put("message", "로테이션 시작 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * 현재 스테이지 상태 조회
     * 
     * @param roomId 방 ID
     * @return 스테이지 정보
     */
    @GetMapping("/status/{roomId}")
    public ResponseEntity<Map<String, Object>> getStageStatus(@PathVariable String roomId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            RoomState room = roomRegistry.getRoom(roomId)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 방입니다: " + roomId));
            
            Stage currentStage = room.getCurrentStage();
            
            response.put("success", true);
            response.put("roomId", roomId);
            response.put("currentStage", currentStage.name());
            response.put("stageOrder", currentStage.getOrder());
            response.put("durationSeconds", currentStage.getDurationSeconds());
            response.put("participantCount", room.getParticipantCount());
            response.put("isActive", currentStage.isActiveStage());
            
            // 다음 스테이지 정보
            Stage nextStage = currentStage.getNextStage();
            if (nextStage != null) {
                response.put("nextStage", nextStage.name());
            }
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * 다음 스테이지로 강제 이동 (테스트용)
     * 
     * @param roomId 방 ID
     * @return 전환 결과
     */
    @PostMapping("/next/{roomId}")
    public ResponseEntity<Map<String, Object>> moveToNextStage(@PathVariable String roomId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            RoomState room = roomRegistry.getRoom(roomId)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 방입니다: " + roomId));
            
            Stage currentStage = room.getCurrentStage();
            Stage nextStage = currentStage.getNextStage();
            
            if (nextStage == null) {
                response.put("success", false);
                response.put("message", "마지막 스테이지입니다");
                response.put("currentStage", currentStage.name());
                return ResponseEntity.badRequest().body(response);
            }
            
            // 다음 스테이지로 전환
            room.setCurrentStage(nextStage);
            
            // 스테이지별 실행 로직 호출
            executeStage(room, nextStage);
            
            log.info("⏭️  스테이지 전환: roomId={}, {} → {}", roomId, currentStage, nextStage);
            
            response.put("success", true);
            response.put("message", "다음 스테이지로 전환되었습니다");
            response.put("previousStage", currentStage.name());
            response.put("currentStage", nextStage.name());
            response.put("durationSeconds", nextStage.getDurationSeconds());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("스테이지 전환 실패: roomId={}", roomId, e);
            response.put("success", false);
            response.put("message", "스테이지 전환 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * 스테이지별 실행 로직
     */
    private void executeStage(RoomState room, Stage stage) {
        switch (stage) {
            case SELF_INTRO -> stageExecutor.executeSelfIntro(room);
            case VOTE_FIRST -> stageExecutor.executeVote(room, true);
            case ROTATION_SHORT -> stageExecutor.executeRotation(room, false);
            case IMAGE_GAME -> stageExecutor.executeGame(room);
            case ROTATION_LONG -> stageExecutor.executeRotation(room, true);
            case VOTE_FINAL -> stageExecutor.executeVote(room, false);
            case MATCHING_RESULT -> stageExecutor.executeMatching(room);
            case FACE_REVEAL -> stageExecutor.executeFaceReveal(room);
            default -> log.warn("알 수 없는 스테이지: {}", stage);
        }
    }
}
