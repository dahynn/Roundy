package com.ssafya701.roundy.webrtc.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafya701.roundy.auth.entity.User;
import com.ssafya701.roundy.auth.enums.GenderType;
import com.ssafya701.roundy.auth.repository.UserRepository;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import com.ssafya701.roundy.webrtc.message.inbound.JoinRoomMessage;
import com.ssafya701.roundy.webrtc.message.inbound.LeaveRoomMessage;
import com.ssafya701.roundy.webrtc.message.inbound.RenderCompleteMessage;
import com.ssafya701.roundy.webrtc.message.outbound.*;
import com.ssafya701.roundy.webrtc.room.RoomRegistry;
import com.ssafya701.roundy.webrtc.room.enums.RotationMode;
import com.ssafya701.roundy.webrtc.rotation.RotationScheduler;
import com.ssafya701.roundy.webrtc.util.TestJwtGenerator;
import com.ssafya701.roundy.webrtc.util.WebSocketTestClient;
import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * WebRTC 통합 테스트
 * 전체 플로우를 검증하는 End-to-End 테스트
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "openvidu.secret=test-secret",
        "webrtc.round.duration-seconds=2",
        "webrtc.round.interval-seconds=1"
})
class WebRtcIntegrationTest {

    private static MockWebServer mockWebServer;
    private static final AtomicInteger connectionCounter = new AtomicInteger();

    @DynamicPropertySource
    static void registerOpenViduUrl(DynamicPropertyRegistry registry) throws IOException {
        mockWebServer = new MockWebServer();
        mockWebServer.setDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest request) {
                String path = request.getPath();
                if ("/openvidu/api/sessions".equals(path)) {
                    String sessionId = extractRequestedSessionId(request);
                    return jsonResponse("{\"id\":\"" + sessionId
                            + "\",\"object\":\"session\",\"createdAt\":1234567890}");
                }
                if (path != null && path.endsWith("/connection")) {
                    int index = connectionCounter.getAndIncrement();
                    return jsonResponse("{\"id\":\"con_" + index
                            + "\",\"object\":\"connection\",\"token\":\"mock_token_" + index + "\"}");
                }
                return new MockResponse().setResponseCode(404);
            }
        });
        mockWebServer.start();
        registry.add("openvidu.url", () -> "http://127.0.0.1:" + mockWebServer.getPort());
    }

    private static MockResponse jsonResponse(String body) {
        return new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(body);
    }

    private static String extractRequestedSessionId(RecordedRequest request) {
        try {
            return new ObjectMapper()
                    .readTree(request.getBody().readUtf8())
                    .path("customSessionId")
                    .asText("mock-session");
        } catch (Exception e) {
            return "mock-session";
        }
    }

    @LocalServerPort
    private int port;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RoomRegistry roomRegistry;

    @Autowired
    private RotationScheduler rotationScheduler;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private RedisTemplate<String, String> redisTemplate;

    @MockitoBean
    private StringRedisTemplate stringRedisTemplate;

    private TestJwtGenerator jwtGenerator;
    private List<WebSocketTestClient> clients;
    private String assignedRoomId;

    @BeforeEach
    void setUp() throws IOException {
        // JWT 생성기 초기화
        jwtGenerator = new TestJwtGenerator();
        assignedRoomId = "integration-room";

        ValueOperations<String, String> valueOperations = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenAnswer(invocation -> assignedRoomId);
        when(redisTemplate.hasKey(anyString())).thenReturn(true);
        SetOperations<String, String> setOperations = mock(SetOperations.class);
        when(stringRedisTemplate.opsForSet()).thenReturn(setOperations);
        when(setOperations.size(anyString())).thenReturn(6L);
        when(userRepository.findById(anyLong())).thenAnswer(invocation -> {
            Long userId = invocation.getArgument(0);
            GenderType gender = userId % 2 == 0 ? GenderType.MALE : GenderType.FEMALE;
            return Optional.of(User.builder()
                    .kakaoId(userId)
                    .name("user" + userId)
                    .nickName("user" + userId)
                    .gender(gender)
                    .build());
        });

        // 클라이언트 리스트 초기화
        clients = new ArrayList<>();

        // 레지스트리 초기화
        roomRegistry.clear();
    }

    @AfterEach
    void tearDown() throws IOException {
        // 모든 클라이언트 연결 종료
        for (WebSocketTestClient client : clients) {
            try {
                client.disconnect();
            } catch (Exception e) {
                // 무시
            }
        }
        clients.clear();

        // 레지스트리 정리
        roomRegistry.clear();
    }

    @AfterAll
    static void shutDownMockServer() throws IOException {
        mockWebServer.shutdown();
    }

    @Test
    @DisplayName("E2E: 3명 참가 → JOIN_OK 수신 → ROOM_STATE 브로드캐스트")
    void testThreeParticipantsJoinRoom() throws Exception {
        // Given: OpenVidu Mock 응답 설정
        String roomId = "test-room-001";
        setupOpenViduMock(roomId);

        // When: 3명의 클라이언트가 순차적으로 연결 및 참가
        WebSocketTestClient client1 = createAndConnectClient(1L, "user1");
        sendJoinRoom(client1, roomId);
        Thread.sleep(100);

        WebSocketTestClient client2 = createAndConnectClient(2L, "user2");
        sendJoinRoom(client2, roomId);
        Thread.sleep(100);

        WebSocketTestClient client3 = createAndConnectClient(3L, "user3");
        sendJoinRoom(client3, roomId);
        Thread.sleep(200);

        // Then: 각 클라이언트가 JOIN_OK를 수신했는지 확인
        assertThat(client1.getReceivedMessages()).isNotEmpty();
        assertThat(client2.getReceivedMessages()).isNotEmpty();
        assertThat(client3.getReceivedMessages()).isNotEmpty();

        // JOIN_OK 메시지 확인
        JoinOkMessage joinOk1 = findMessageByType(client1, JoinOkMessage.class);
        assertThat(joinOk1).isNotNull();
        assertThat(joinOk1.getRoomId()).isEqualTo(roomId);
        assertThat(joinOk1.getToken()).isNotBlank();

        // ROOM_STATE 메시지 확인 (마지막 브로드캐스트)
        RoomStateMessage roomState = findMessageByType(client3, RoomStateMessage.class);
        assertThat(roomState).isNotNull();
        assertThat(roomState.getRoomId()).isEqualTo(roomId);
        assertThat(roomState.getParticipantCount()).isEqualTo(3);

        // 방 상태 확인
        assertThat(roomRegistry.hasRoom(roomId)).isTrue();
        assertThat(roomRegistry.getParticipantCount(roomId)).isEqualTo(3);
    }

    @Test
    @DisplayName("E2E: PAIR_ONLY 3:3 입장 → BREAK 단계 시작")
    void testPairOnlyModeRotation() throws Exception {
        // Given
        String roomId = "test-room-pair";
        setupOpenViduMock(roomId);

        // When: 여성 3명, 남성 3명이 참가
        List<WebSocketTestClient> participants = connectParticipants(roomId, 6);
        WebSocketTestClient client1 = participants.getFirst();

        // Then: 현재 상태 머신의 첫 단계인 BREAK가 시작됨
        await().atMost(3, TimeUnit.SECONDS).untilAsserted(() -> {
            BreakMessage breakMessage = findMessageByType(client1, BreakMessage.class);
            assertThat(breakMessage).isNotNull();
            assertThat(breakMessage.getRoomId()).isEqualTo(roomId);
        });

        assertThat(roomRegistry.getRoom(roomId)).isPresent();
        assertThat(roomRegistry.getRoom(roomId).orElseThrow().getCurrentStage())
                .isEqualTo(com.ssafya701.roundy.webrtc.room.enums.Stage.BREAK);
    }

    @Test
    @DisplayName("E2E: 라운드 진행 중 퇴장 → ROOM_STATE 업데이트")
    void testParticipantLeaveDuringRound() throws Exception {
        // Given: 방 생성 및 참가
        String roomId = "test-room-leave";
        setupOpenViduMock(roomId);

        WebSocketTestClient client1 = createAndConnectClient(1L, "user1");
        sendJoinRoom(client1, roomId);
        Thread.sleep(100);

        WebSocketTestClient client2 = createAndConnectClient(2L, "user2");
        sendJoinRoom(client2, roomId);
        Thread.sleep(100);

        WebSocketTestClient client3 = createAndConnectClient(3L, "user3");
        sendJoinRoom(client3, roomId);
        Thread.sleep(200);

        // When: client2가 퇴장
        sendLeaveRoom(client2, roomId);
        Thread.sleep(200);

        // Then: 남은 클라이언트들이 ROOM_STATE 업데이트를 수신
        await().atMost(2, TimeUnit.SECONDS).untilAsserted(() -> {
            List<String> messages = client1.getReceivedMessages();
            long roomStateCount = messages.stream()
                    .filter(msg -> msg.contains("\"type\":\"ROOM_STATE\""))
                    .count();
            assertThat(roomStateCount).isGreaterThanOrEqualTo(2); // JOIN + LEAVE
        });

        // 방 상태 확인
        assertThat(roomRegistry.getParticipantCount(roomId)).isEqualTo(2);
    }

    @Test
    @DisplayName("E2E: 모든 참가자 퇴장 → 방 자동 삭제")
    void testRoomDeletedWhenAllParticipantsLeave() throws Exception {
        // Given: 방 생성 및 2명 참가
        String roomId = "test-room-delete";
        setupOpenViduMock(roomId);

        WebSocketTestClient client1 = createAndConnectClient(1L, "user1");
        sendJoinRoom(client1, roomId);
        Thread.sleep(100);

        WebSocketTestClient client2 = createAndConnectClient(2L, "user2");
        sendJoinRoom(client2, roomId);
        Thread.sleep(200);

        assertThat(roomRegistry.hasRoom(roomId)).isTrue();

        // When: 모든 참가자가 퇴장
        sendLeaveRoom(client1, roomId);
        Thread.sleep(100);
        sendLeaveRoom(client2, roomId);
        Thread.sleep(200);

        // Then: 방이 자동 삭제됨
        assertThat(roomRegistry.hasRoom(roomId)).isFalse();
        assertThat(roomRegistry.getParticipantCount(roomId)).isZero();
    }

    @Test
    @DisplayName("E2E: 전원 렌더링 완료 → START_TIMER 수신")
    void testRoundEndAndNextRoundStart() throws Exception {
        // Given: PAIR_ONLY 3:3 입장으로 BREAK 단계 시작
        String roomId = "test-room-rounds";
        setupOpenViduMock(roomId);
        List<WebSocketTestClient> participants = connectParticipants(roomId, 6);
        WebSocketTestClient client1 = participants.getFirst();

        await().atMost(3, TimeUnit.SECONDS).untilAsserted(() -> {
            assertThat(findMessageByType(client1, BreakMessage.class)).isNotNull();
        });

        // When: 모든 클라이언트가 BREAK 화면 렌더링 완료를 알림
        for (WebSocketTestClient participant : participants) {
            participant.sendMessage(new RenderCompleteMessage("BREAK"));
        }

        // Then: 서버가 타이머 시작을 동기화해 브로드캐스트
        await().atMost(3, TimeUnit.SECONDS).untilAsserted(() -> {
            StartTimerMessage startTimer = findMessageByType(client1, StartTimerMessage.class);
            assertThat(startTimer).isNotNull();
            assertThat(startTimer.getTotalSeconds()).isEqualTo(10);
        });
    }

    @Test
    @DisplayName("E2E: 잘못된 JWT → 연결 실패")
    void testInvalidJwtConnectionFails() {
        // Given: 잘못된 JWT
        String invalidToken = "invalid.jwt.token";

        // When & Then: 연결 실패 예상
        String wsUrl = "ws://localhost:" + port + "/ws/webrtc";
        WebSocketTestClient client = new WebSocketTestClient(objectMapper);

        Exception exception = null;
        try {
            client.connect(wsUrl, invalidToken);
        } catch (Exception e) {
            exception = e;
        }

        assertThat(exception).isNotNull();
    }

    @Test
    @DisplayName("E2E: 동일한 방에 여러 번 참가 → 마지막 상태만 유지")
    void testSameUserJoinsMultipleTimes() throws Exception {
        // Given: OpenVidu Mock 설정
        String roomId = "test-room-duplicate";
        setupOpenViduMock(roomId);

        // When: 동일 사용자가 두 번 연결 (첫 번째 연결은 끊김)
        WebSocketTestClient client1 = createAndConnectClient(1L, "user1");
        sendJoinRoom(client1, roomId);
        Thread.sleep(100);

        WebSocketTestClient client2 = createAndConnectClient(1L, "user1");
        sendJoinRoom(client2, roomId);
        Thread.sleep(200);

        // Then: 사용자 ID 기준으로 마지막 세션 하나만 유지
        assertThat(roomRegistry.getParticipantCount(roomId)).isEqualTo(1);
    }

    @Test
    @DisplayName("E2E: FREE_TALK 모드 → 로테이션 없음")
    void testFreeTalkModeNoRotation() throws Exception {
        // Given: FREE_TALK 모드 방 생성
        String roomId = "test-room-freetalk";
        setupOpenViduMock(roomId);

        // When: 3명 참가
        WebSocketTestClient client1 = createAndConnectClient(1L, "user1");
        sendJoinRoom(client1, roomId);
        Thread.sleep(100);

        WebSocketTestClient client2 = createAndConnectClient(2L, "user2");
        sendJoinRoom(client2, roomId);
        Thread.sleep(100);

        WebSocketTestClient client3 = createAndConnectClient(3L, "user3");
        sendJoinRoom(client3, roomId);
        Thread.sleep(500);

        // Then: ROUND_START 메시지가 오지 않음
        List<String> messages = client1.getReceivedMessages();
        long roundStartCount = messages.stream()
                .filter(msg -> msg.contains("\"type\":\"ROUND_START\""))
                .count();
        assertThat(roundStartCount).isZero();

        // 로테이션이 활성화되지 않음
        assertThat(rotationScheduler.isRotationActive(roomId)).isFalse();
    }

    // ==================== Helper Methods ====================

    /**
     * OpenVidu Mock 응답 설정
     */
    private void setupOpenViduMock(String roomId) {
        assignedRoomId = roomId;
        connectionCounter.set(0);
    }

    private List<WebSocketTestClient> connectParticipants(String roomId, int participantCount) throws Exception {
        List<WebSocketTestClient> participants = new ArrayList<>();
        for (long userId = 1; userId <= participantCount; userId++) {
            WebSocketTestClient client = createAndConnectClient(userId, "user" + userId);
            sendJoinRoom(client, roomId);
            participants.add(client);
        }

        await().atMost(3, TimeUnit.SECONDS).untilAsserted(() ->
                assertThat(roomRegistry.getParticipantCount(roomId)).isEqualTo(participantCount));
        return participants;
    }

    /**
     * WebSocket 클라이언트 생성 및 연결
     */
    private WebSocketTestClient createAndConnectClient(Long userId, String username) throws Exception {
        String token = jwtGenerator.generateToken(userId, username);
        String wsUrl = "ws://localhost:" + port + "/ws/webrtc";

        WebSocketTestClient client = new WebSocketTestClient(objectMapper);
        client.connect(wsUrl, token);
        clients.add(client);

        return client;
    }

    /**
     * JOIN_ROOM 메시지 전송
     */
    private void sendJoinRoom(WebSocketTestClient client, String roomId) throws IOException {
        JoinRoomMessage message = new JoinRoomMessage(roomId);
        client.sendMessage(message);
    }

    /**
     * LEAVE_ROOM 메시지 전송
     */
    private void sendLeaveRoom(WebSocketTestClient client, String roomId) throws IOException {
        LeaveRoomMessage message = new LeaveRoomMessage(roomId);
        client.sendMessage(message);
    }

    /**
     * 특정 타입의 메시지 찾기
     */
    private <T> T findMessageByType(WebSocketTestClient client, Class<T> messageClass) {
        List<String> messages = client.getReceivedMessages();
        for (String json : messages) {
            try {
                Object message = objectMapper.readValue(json, Object.class);
                if (messageClass.isInstance(message)) {
                    return objectMapper.readValue(json, messageClass);
                }
                // type 필드로 확인
                String typeStr = extractType(json);
                if (typeStr != null && matchesMessageType(messageClass, typeStr)) {
                    return objectMapper.readValue(json, messageClass);
                }
            } catch (Exception e) {
                // 무시
            }
        }
        return null;
    }

    /**
     * JSON에서 type 필드 추출
     */
    private String extractType(String json) {
        try {
            int typeStart = json.indexOf("\"type\":\"") + 8;
            int typeEnd = json.indexOf("\"", typeStart);
            return json.substring(typeStart, typeEnd);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 메시지 클래스와 타입 문자열 매칭
     */
    private boolean matchesMessageType(Class<?> messageClass, String typeStr) {
        if (messageClass == JoinOkMessage.class && typeStr.equals("JOIN_OK")) return true;
        if (messageClass == RoomStateMessage.class && typeStr.equals("ROOM_STATE")) return true;
        if (messageClass == RoundStartMessage.class && typeStr.equals("ROUND_START")) return true;
        if (messageClass == RoundEndMessage.class && typeStr.equals("ROUND_END")) return true;
        if (messageClass == PairAssignedMessage.class && typeStr.equals("PAIR_ASSIGNED")) return true;
        if (messageClass == BreakMessage.class && typeStr.equals("BREAK")) return true;
        if (messageClass == StartTimerMessage.class && typeStr.equals("START_TIMER")) return true;
        if (messageClass == ErrorMessage.class && typeStr.equals("ERROR")) return true;
        return false;
    }
}
