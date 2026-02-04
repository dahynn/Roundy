package com.ssafya701.roundy.webrtc.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.ssafya701.roundy.global.common.CommonResponse;
import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import com.ssafya701.roundy.webrtc.message.inbound.JoinRoomMessage;
import com.ssafya701.roundy.webrtc.message.inbound.LeaveRoomMessage;
import com.ssafya701.roundy.webrtc.message.outbound.*;
import com.ssafya701.roundy.webrtc.room.enums.Stage;
import com.ssafya701.roundy.webrtc.serializer.WsMessageSerializer;
import com.ssafya701.roundy.match.service.MatchService;
import com.ssafya701.roundy.match.repository.SessionRepository;
import com.ssafya701.roundy.match.entity.Session;
import com.ssafya701.roundy.match.enums.SessionStatus;
import com.ssafya701.roundy.global.jwt.JwtTokenProvider;
import com.ssafya701.roundy.auth.enums.UserRole;
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
    private final MatchService matchService;
    private final JwtTokenProvider jwtTokenProvider;
    private final SessionRepository sessionRepository;

    public MessageTestController(WsMessageSerializer serializer, MatchService matchService, JwtTokenProvider jwtTokenProvider, SessionRepository sessionRepository) {
        this.serializer = serializer;
        this.matchService = matchService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.sessionRepository = sessionRepository;
    }

    /**
     * 모든 메시지 타입 목록 조회
     * GET /api/test/ws-message/types
     */
    @GetMapping("/types")
    public CommonResponse<List<String>> getMessageTypes() {
        List<String> types = Arrays.stream(WsMessageType.values())
                .map(Enum::name)
                .toList();
        return CommonResponse.ofSuccess(types);
    }

    /**
     * 샘플 메시지 JSON 생성
     * GET /api/test/ws-message/samples/{type}
     *
     * @param type JOIN_ROOM, LEAVE_ROOM, JOIN_OK, ROOM_STATE, ROUND_START, ROUND_END, PAIR_ASSIGNED, ERROR
     */
    @GetMapping("/samples/{type}")
    public CommonResponse<?> getSampleMessage(@PathVariable String type) {
        try {
            WsMessage sample = createSampleMessage(type.toUpperCase());
            String json = serializer.serialize(sample);
            return CommonResponse.ofSuccess(json);
        } catch (IllegalArgumentException e) {
            return CommonResponse.ofFailure("알 수 없는 메시지 타입: " + type);
        } catch (JsonProcessingException e) {
            return CommonResponse.ofFailure("직렬화 실패: " + e.getMessage());
        }
    }

    /**
     * 역직렬화 테스트
     * POST /api/test/ws-message/deserialize
     * Body: {"type": "JOIN_ROOM", "roomId": "test"}
     */
    @PostMapping("/deserialize")
    public CommonResponse<?> testDeserialize(@RequestBody String json) {
        try {
            WsMessage message = serializer.deserialize(json);

            Map<String, Object> data = new HashMap<>();
            data.put("messageType", message.getType().name());
            data.put("messageClass", message.getClass().getSimpleName());
            data.put("deserializedObject", message);

            return CommonResponse.ofSuccess(data);
        } catch (JsonProcessingException e) {
            return CommonResponse.ofFailure("역직렬화 실패: " + e.getMessage());
        }
    }

    /**
     * 직렬화 테스트 - JOIN_ROOM
     * POST /api/test/ws-message/serialize/join-room?roomId=xxx
     */
    @PostMapping("/serialize/join-room")
    public CommonResponse<?> serializeJoinRoom(@RequestParam String roomId) {
        try {
            JoinRoomMessage message = new JoinRoomMessage(roomId);
            return CommonResponse.ofSuccess(serializer.serialize(message));
        } catch (JsonProcessingException e) {
            return CommonResponse.ofFailure("직렬화 실패: " + e.getMessage());
        }
    }

    /**
     * 직렬화 테스트 - LEAVE_ROOM
     * POST /api/test/ws-message/serialize/leave-room?roomId=xxx
     */
    @PostMapping("/serialize/leave-room")
    public CommonResponse<?> serializeLeaveRoom(@RequestParam String roomId) {
        try {
            LeaveRoomMessage message = new LeaveRoomMessage(roomId);
            return CommonResponse.ofSuccess(serializer.serialize(message));
        } catch (JsonProcessingException e) {
            return CommonResponse.ofFailure("직렬화 실패: " + e.getMessage());
        }
    }

    /**
     * 직렬화 테스트 - ERROR
     * POST /api/test/ws-message/serialize/error?code=xxx&message=yyy
     */
    @PostMapping("/serialize/error")
    public CommonResponse<?> serializeError(
            @RequestParam String code,
            @RequestParam String message) {
        try {
            ErrorMessage errorMessage = new ErrorMessage(code, message);
            return CommonResponse.ofSuccess(serializer.serialize(errorMessage));
        } catch (JsonProcessingException e) {
            return CommonResponse.ofFailure("직렬화 실패: " + e.getMessage());
        }
    }

    /**
     * 왕복 변환 테스트 (직렬화 → 역직렬화)
     * POST /api/test/ws-message/round-trip/{type}
     */
    @PostMapping("/round-trip/{type}")
    public CommonResponse<?> testRoundTrip(@PathVariable String type) {
        try {
            // 1. 샘플 생성
            WsMessage original = createSampleMessage(type.toUpperCase());

            // 2. 직렬화
            String json = serializer.serialize(original);

            // 3. 역직렬화
            WsMessage deserialized = serializer.deserialize(json);

            // 4. 결과
            Map<String, Object> data = new HashMap<>();
            data.put("originalType", original.getType().name());
            data.put("deserializedType", deserialized.getType().name());
            data.put("json", json);
            data.put("matches", original.getType().equals(deserialized.getType()));

            return CommonResponse.ofSuccess(data);
        } catch (Exception e) {
            return CommonResponse.ofFailure(e.getMessage());
        }
    }

    // MatchService 주입 필요 (필드 추가)
//    private final com.ssafya701.roundy.match.service.MatchService matchService;


    // 기존 메서드들 유지... (생성자만 수정)

    /**
     * 매칭 결과 저장 테스트 (DB 영속화 확인용)
     * POST /api/test/ws-message/save-match
     * Query Params: roomId, maleId, femaleId
     */
    @PostMapping("/save-match")
    public CommonResponse<?> verifyMatchSave(
            @RequestParam String roomId,
            @RequestParam Long maleId,
            @RequestParam Long femaleId) {
        try {
            // 실제 Session 조회
            Session session = sessionRepository.findByRoomId(roomId)
                    .orElseGet(() -> {
                        // 테스트용 세션 자동 생성
                        Session newSession = Session.builder()
                                .roomId(roomId)
                                .status(SessionStatus.ONGOING)
                                .maleMax(6)
                                .femaleMax(6)
                                .build();
                        return sessionRepository.save(newSession);
                    });
            
            com.ssafya701.roundy.match.entity.Match match = matchService.createMatch(session.getId(), maleId, femaleId);
            return CommonResponse.ofSuccess("매칭 저장 완료: ID=" + match.getId() + ", SessionID=" + session.getId());
        } catch (Exception e) {
            return CommonResponse.ofFailure("매칭 저장 실패: " + e.getMessage());
        }
    }

    /**
     * 개발용 JWT 토큰 발급 (카카오 로그인 없이 테스트 가능)
     * POST /api/test/ws-message/dev-login?userId=1001
     */
    @PostMapping("/dev-login")
    public CommonResponse<?> devLogin(@RequestParam Long userId) {
        try {
            // UserRole.USER 권한으로 엑세스 토큰 생성
            String token = jwtTokenProvider.createAccessToken(userId, UserRole.USER);
            return CommonResponse.ofSuccess(token);
        } catch (Exception e) {
            return CommonResponse.ofFailure("토큰 생성 실패: " + e.getMessage());
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
                            new RoomStateMessage.ParticipantDto(1L, "Alice", "FEMALE"),
                            new RoomStateMessage.ParticipantDto(2L, "Bob", "MALE"),
                            new RoomStateMessage.ParticipantDto(3L, "Charlie", "MALE")
                    ),
                    3
            );
            case "STAGE_CHANGE" -> new StageChangeMessage("room-123", Stage.SELF_INTRO, 60);
            case "MATCH_RESULT" -> new MatchResultMessage(
                    true,
                    2L,
                    "Bob"
            );
            case "ROUND_START" -> new RoundStartMessage("room-123", 1, 300);
            case "ROUND_END" -> new RoundEndMessage("room-123", 1);
            case "PAIR_ASSIGNED" -> new PairAssignedMessage(
                    "room-123",      // roomId
                    1,               // roundNumber
                    2L,              // partnerId
                    "Bob",           // partnerNickname
                    "room-123-pair-round1-1-2",  // privateSessionId
                    "test-token-xyz" // privateToken
            );
            case "ERROR" -> new ErrorMessage("ROOM_NOT_FOUND", "방을 찾을 수 없습니다");
            default -> throw new IllegalArgumentException("알 수 없는 메시지 타입: " + type);
        };
    }
}
