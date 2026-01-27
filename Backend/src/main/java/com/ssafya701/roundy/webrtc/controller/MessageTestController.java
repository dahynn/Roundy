package com.ssafya701.roundy.webrtc.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import com.ssafya701.roundy.webrtc.message.inbound.JoinRoomMessage;
import com.ssafya701.roundy.webrtc.message.inbound.LeaveRoomMessage;
import com.ssafya701.roundy.webrtc.message.outbound.*;
import com.ssafya701.roundy.webrtc.serializer.WsMessageSerializer;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * WebSocket 메시지 모델 테스트용 임시 컨트롤러
 * Postman으로 메시지 직렬화/역직렬화 테스트 가능
 * 
 * 주의: 개발/테스트 전용, 프로덕션 배포 시 제거 필요
 */
@RestController
@RequestMapping("/api/test/ws-message")
public class MessageTestController {
    
    private final WsMessageSerializer serializer;
    
    public MessageTestController(WsMessageSerializer serializer) {
        this.serializer = serializer;
    }
    
    /**
     * 모든 메시지 타입 목록 조회
     * GET /api/test/ws-message/types
     */
    @GetMapping("/types")
    public ResponseEntity<List<String>> getMessageTypes() {
        List<String> types = Arrays.stream(WsMessageType.values())
            .map(Enum::name)
            .toList();
        return ResponseEntity.ok(types);
    }
    
    /**
     * 샘플 메시지 JSON 생성
     * GET /api/test/ws-message/samples/{type}
     * 
     * @param type JOIN_ROOM, LEAVE_ROOM, JOIN_OK, ROOM_STATE, ROUND_START, ROUND_END, PAIR_ASSIGNED, ERROR
     */
    @GetMapping("/samples/{type}")
    public ResponseEntity<String> getSampleMessage(@PathVariable String type) {
        try {
            WsMessage sample = createSampleMessage(type.toUpperCase());
            String json = serializer.serialize(sample);
            return ResponseEntity.ok(json);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("알 수 없는 메시지 타입: " + type);
        } catch (JsonProcessingException e) {
            return ResponseEntity.internalServerError().body("직렬화 실패: " + e.getMessage());
        }
    }
    
    /**
     * 역직렬화 테스트
     * POST /api/test/ws-message/deserialize
     * Body: {"type": "JOIN_ROOM", "roomId": "test"}
     */
    @PostMapping("/deserialize")
    public ResponseEntity<?> testDeserialize(@RequestBody String json) {
        try {
            WsMessage message = serializer.deserialize(json);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("messageType", message.getType().name());
            response.put("messageClass", message.getClass().getSimpleName());
            response.put("deserializedObject", message);
            
            return ResponseEntity.ok(response);
        } catch (JsonProcessingException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            errorResponse.put("inputJson", json);
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 직렬화 테스트 - JOIN_ROOM
     * POST /api/test/ws-message/serialize/join-room?roomId=xxx
     */
    @PostMapping("/serialize/join-room")
    public ResponseEntity<String> serializeJoinRoom(@RequestParam String roomId) {
        try {
            JoinRoomMessage message = new JoinRoomMessage(roomId);
            return ResponseEntity.ok(serializer.serialize(message));
        } catch (JsonProcessingException e) {
            return ResponseEntity.internalServerError().body("직렬화 실패: " + e.getMessage());
        }
    }
    
    /**
     * 직렬화 테스트 - LEAVE_ROOM
     * POST /api/test/ws-message/serialize/leave-room?roomId=xxx
     */
    @PostMapping("/serialize/leave-room")
    public ResponseEntity<String> serializeLeaveRoom(@RequestParam String roomId) {
        try {
            LeaveRoomMessage message = new LeaveRoomMessage(roomId);
            return ResponseEntity.ok(serializer.serialize(message));
        } catch (JsonProcessingException e) {
            return ResponseEntity.internalServerError().body("직렬화 실패: " + e.getMessage());
        }
    }
    
    /**
     * 직렬화 테스트 - ERROR
     * POST /api/test/ws-message/serialize/error?code=xxx&message=yyy
     */
    @PostMapping("/serialize/error")
    public ResponseEntity<String> serializeError(
            @RequestParam String code,
            @RequestParam String message) {
        try {
            ErrorMessage errorMessage = new ErrorMessage(code, message);
            return ResponseEntity.ok(serializer.serialize(errorMessage));
        } catch (JsonProcessingException e) {
            return ResponseEntity.internalServerError().body("직렬화 실패: " + e.getMessage());
        }
    }
    
    /**
     * 왕복 변환 테스트 (직렬화 → 역직렬화)
     * POST /api/test/ws-message/round-trip/{type}
     */
    @PostMapping("/round-trip/{type}")
    public ResponseEntity<?> testRoundTrip(@PathVariable String type) {
        try {
            // 1. 샘플 생성
            WsMessage original = createSampleMessage(type.toUpperCase());
            
            // 2. 직렬화
            String json = serializer.serialize(original);
            
            // 3. 역직렬화
            WsMessage deserialized = serializer.deserialize(json);
            
            // 4. 결과
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("originalType", original.getType().name());
            response.put("deserializedType", deserialized.getType().name());
            response.put("json", json);
            response.put("matches", original.getType().equals(deserialized.getType()));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    // 샘플 메시지 생성 헬퍼 메서드
    private WsMessage createSampleMessage(String type) {
        return switch (type) {
            case "JOIN_ROOM" -> new JoinRoomMessage("room-123");
            case "LEAVE_ROOM" -> new LeaveRoomMessage("room-123");
            case "JOIN_OK" -> new JoinOkMessage(
                "room-123",
                "https://openvidu.example.com",
                "token-xyz-abc-123",
                "ALL",
                new JoinOkMessage.RoundInfoDto(1, 5, 300)
            );
            case "ROOM_STATE" -> new RoomStateMessage(
                "room-123",
                Arrays.asList(
                    new RoomStateMessage.ParticipantDto(1L, "Alice"),
                    new RoomStateMessage.ParticipantDto(2L, "Bob"),
                    new RoomStateMessage.ParticipantDto(3L, "Charlie")
                ),
                3
            );
            case "ROUND_START" -> new RoundStartMessage("room-123", 1, 300);
            case "ROUND_END" -> new RoundEndMessage("room-123", 1);
            case "PAIR_ASSIGNED" -> new PairAssignedMessage("room-123", 1, 2L, "Bob");
            case "ERROR" -> new ErrorMessage("ROOM_NOT_FOUND", "방을 찾을 수 없습니다");
            default -> throw new IllegalArgumentException("알 수 없는 메시지 타입: " + type);
        };
    }
}
