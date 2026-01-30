package com.ssafya701.roundy.webrtc.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import com.ssafya701.roundy.webrtc.message.inbound.JoinRoomMessage;
import com.ssafya701.roundy.webrtc.message.inbound.LeaveRoomMessage;
import com.ssafya701.roundy.webrtc.message.outbound.ErrorMessage;
import com.ssafya701.roundy.webrtc.message.outbound.JoinOkMessage;
import com.ssafya701.roundy.webrtc.message.outbound.RoomStateMessage;
import com.ssafya701.roundy.webrtc.openvidu.OpenViduClient;
import com.ssafya701.roundy.webrtc.openvidu.dto.OpenViduSessionResponse;
import com.ssafya701.roundy.webrtc.openvidu.dto.OpenViduTokenResponse;
import com.ssafya701.roundy.webrtc.room.RoomRegistry;
import com.ssafya701.roundy.webrtc.util.TestJwtGenerator;
import com.ssafya701.roundy.webrtc.util.WebSocketTestClient;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/**
 * WebRtcWebSocketHandler 통합 테스트
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class WebRtcWebSocketHandlerTest {

    @LocalServerPort
    private int port;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RoomRegistry roomRegistry;

    private MockWebServer mockOpenViduServer;
    private TestJwtGenerator jwtGenerator;
    private String wsUrl;

    @BeforeEach
    void setUp() throws IOException {
        // MockWebServer 시작
        mockOpenViduServer = new MockWebServer();
        mockOpenViduServer.start(8080);

        // JWT 생성기 초기화
        jwtGenerator = new TestJwtGenerator();

        // WebSocket URL 설정
        wsUrl = "ws://localhost:" + port + "/ws/webrtc";

        // 방 레지스트리 초기화
        roomRegistry.clear();
    }

    @AfterEach
    void tearDown() throws IOException {
        if (mockOpenViduServer != null) {
            mockOpenViduServer.shutdown();
        }
    }

    @Test
    @Order(1)
    @DisplayName("JWT 인증 성공 테스트")
    void testJwtAuthenticationSuccess() throws Exception {
        // Given
        String token = jwtGenerator.generateToken(1L, "testUser");
        WebSocketTestClient client = new WebSocketTestClient(objectMapper);

        // When & Then
        assertThat(client.connect(wsUrl, token)).isNotNull();
        
        client.disconnect();
    }

    @Test
    @Order(2)
    @DisplayName("JWT 인증 실패 - 토큰 없음")
    void testJwtAuthenticationFailure_NoToken() {
        // Given
        WebSocketTestClient client = new WebSocketTestClient(objectMapper);

        // When & Then
        Assertions.assertThrows(Exception.class, () -> {
            client.connect(wsUrl, "");
        });
    }

    @Test
    @Order(3)
    @DisplayName("JWT 인증 실패 - 잘못된 서명")
    void testJwtAuthenticationFailure_InvalidSignature() {
        // Given
        String invalidToken = jwtGenerator.generateInvalidSignatureToken(1L, "testUser");
        WebSocketTestClient client = new WebSocketTestClient(objectMapper);

        // When & Then
        Assertions.assertThrows(Exception.class, () -> {
            client.connect(wsUrl, invalidToken);
        });
    }

    @Test
    @Order(4)
    @DisplayName("JOIN_ROOM 메시지 처리 테스트")
    void testJoinRoomMessage() throws Exception {
        // Given
        mockOpenViduCreateSession("room-123");
        mockOpenViduCreateToken("test-token-123");

        String token = jwtGenerator.generateToken(1L, "user1");
        WebSocketTestClient client = new WebSocketTestClient(objectMapper);
        client.connect(wsUrl, token);

        // When
        JoinRoomMessage joinMessage = new JoinRoomMessage("room-123");
        client.sendMessage(joinMessage);

        // Then - JOIN_OK 메시지 수신 대기
        await().atMost(3, TimeUnit.SECONDS).until(() -> 
            client.getReceivedMessages().stream()
                .anyMatch(msg -> msg.contains("JOIN_OK"))
        );

        List<String> messages = client.getReceivedMessages();
        assertThat(messages).hasSizeGreaterThanOrEqualTo(1);

        // JOIN_OK 메시지 검증
        String joinOkJson = messages.stream()
            .filter(msg -> msg.contains("JOIN_OK"))
            .findFirst()
            .orElseThrow();

        JoinOkMessage joinOk = objectMapper.readValue(joinOkJson, JoinOkMessage.class);
        assertThat(joinOk.getType()).isEqualTo(WsMessageType.JOIN_OK);
        assertThat(joinOk.getRoomId()).isEqualTo("room-123");
        assertThat(joinOk.getToken()).isEqualTo("test-token-123");
        assertThat(joinOk.getOpenviduUrl()).isEqualTo("http://localhost:8080");

        // 방 레지스트리 검증
        assertThat(roomRegistry.hasRoom("room-123")).isTrue();
        assertThat(roomRegistry.getParticipantCount("room-123")).isEqualTo(1);

        client.disconnect();
    }

    @Test
    @Order(5)
    @DisplayName("다중 사용자 JOIN_ROOM 및 ROOM_STATE 브로드캐스트 테스트")
    void testMultipleUsersJoinRoom() throws Exception {
        // Given
        mockOpenViduCreateSession("room-456");
        mockOpenViduCreateToken("token-user1");
        mockOpenViduCreateToken("token-user2");
        mockOpenViduCreateToken("token-user3");

        String token1 = jwtGenerator.generateToken(1L, "user1");
        String token2 = jwtGenerator.generateToken(2L, "user2");
        String token3 = jwtGenerator.generateToken(3L, "user3");

        WebSocketTestClient client1 = new WebSocketTestClient(objectMapper);
        WebSocketTestClient client2 = new WebSocketTestClient(objectMapper);
        WebSocketTestClient client3 = new WebSocketTestClient(objectMapper);

        client1.connect(wsUrl, token1);
        client2.connect(wsUrl, token2);
        client3.connect(wsUrl, token3);

        // When
        JoinRoomMessage joinMessage = new JoinRoomMessage("room-456");
        client1.sendMessage(joinMessage);
        
        Thread.sleep(500); // 첫 번째 참가 처리 대기
        
        client2.sendMessage(joinMessage);
        client3.sendMessage(joinMessage);

        // Then - 모든 클라이언트가 ROOM_STATE 수신 대기
        await().atMost(5, TimeUnit.SECONDS).until(() -> 
            client1.getReceivedMessages().stream().anyMatch(msg -> msg.contains("ROOM_STATE")) &&
            client2.getReceivedMessages().stream().anyMatch(msg -> msg.contains("ROOM_STATE")) &&
            client3.getReceivedMessages().stream().anyMatch(msg -> msg.contains("ROOM_STATE"))
        );

        // 방 레지스트리 검증
        assertThat(roomRegistry.getParticipantCount("room-456")).isEqualTo(3);

        // ROOM_STATE 메시지 검증
        String roomStateJson = client1.getReceivedMessages().stream()
            .filter(msg -> msg.contains("ROOM_STATE"))
            .reduce((first, second) -> second) // 마지막 ROOM_STATE
            .orElseThrow();

        RoomStateMessage roomState = objectMapper.readValue(roomStateJson, RoomStateMessage.class);
        assertThat(roomState.getType()).isEqualTo(WsMessageType.ROOM_STATE);
        assertThat(roomState.getParticipantCount()).isEqualTo(3);
        assertThat(roomState.getParticipants()).hasSize(3);

        client1.disconnect();
        client2.disconnect();
        client3.disconnect();
    }

    @Test
    @Order(6)
    @DisplayName("LEAVE_ROOM 메시지 처리 테스트")
    void testLeaveRoomMessage() throws Exception {
        // Given
        mockOpenViduCreateSession("room-789");
        mockOpenViduCreateToken("token-user1");
        mockOpenViduCreateToken("token-user2");

        String token1 = jwtGenerator.generateToken(1L, "user1");
        String token2 = jwtGenerator.generateToken(2L, "user2");

        WebSocketTestClient client1 = new WebSocketTestClient(objectMapper);
        WebSocketTestClient client2 = new WebSocketTestClient(objectMapper);

        client1.connect(wsUrl, token1);
        client2.connect(wsUrl, token2);

        // 두 사용자 참가
        JoinRoomMessage joinMessage = new JoinRoomMessage("room-789");
        client1.sendMessage(joinMessage);
        Thread.sleep(500);
        client2.sendMessage(joinMessage);

        await().atMost(3, TimeUnit.SECONDS).until(() -> 
            roomRegistry.getParticipantCount("room-789") == 2
        );

        client1.clearReceivedMessages();
        client2.clearReceivedMessages();

        // When - user1이 퇴장
        LeaveRoomMessage leaveMessage = new LeaveRoomMessage("room-789");
        client1.sendMessage(leaveMessage);

        // Then
        await().atMost(3, TimeUnit.SECONDS).until(() -> 
            roomRegistry.getParticipantCount("room-789") == 1
        );

        // ROOM_STATE 브로드캐스트 확인
        await().atMost(3, TimeUnit.SECONDS).until(() -> 
            client2.getReceivedMessages().stream().anyMatch(msg -> msg.contains("ROOM_STATE"))
        );

        String roomStateJson = client2.getReceivedMessages().stream()
            .filter(msg -> msg.contains("ROOM_STATE"))
            .findFirst()
            .orElseThrow();

        RoomStateMessage roomState = objectMapper.readValue(roomStateJson, RoomStateMessage.class);
        assertThat(roomState.getParticipantCount()).isEqualTo(1);
        assertThat(roomState.getParticipants()).hasSize(1);
        assertThat(roomState.getParticipants().get(0).getUserId()).isEqualTo(2L);

        client1.disconnect();
        client2.disconnect();
    }

    @Test
    @Order(7)
    @DisplayName("연결 끊김 시 자동 퇴장 테스트")
    void testAutoLeaveOnDisconnect() throws Exception {
        // Given
        mockOpenViduCreateSession("room-disconnect");
        mockOpenViduCreateToken("token-user1");

        String token = jwtGenerator.generateToken(1L, "user1");
        WebSocketTestClient client = new WebSocketTestClient(objectMapper);
        client.connect(wsUrl, token);

        JoinRoomMessage joinMessage = new JoinRoomMessage("room-disconnect");
        client.sendMessage(joinMessage);

        await().atMost(3, TimeUnit.SECONDS).until(() -> 
            roomRegistry.getParticipantCount("room-disconnect") == 1
        );

        // When - 연결 끊김
        client.disconnect();

        // Then - 자동으로 방에서 제거됨
        await().atMost(3, TimeUnit.SECONDS).until(() -> 
            roomRegistry.getParticipantCount("room-disconnect") == 0
        );

        // 방이 비어서 삭제되었는지 확인
        assertThat(roomRegistry.hasRoom("room-disconnect")).isFalse();
    }

    @Test
    @Order(8)
    @DisplayName("잘못된 메시지 형식 에러 처리 테스트")
    void testInvalidMessageFormat() throws Exception {
        // Given
        String token = jwtGenerator.generateToken(1L, "user1");
        WebSocketTestClient client = new WebSocketTestClient(objectMapper);
        client.connect(wsUrl, token);

        // When - 잘못된 JSON 전송
        client.sendRawMessage("{invalid json}");

        // Then - ERROR 메시지 수신
        await().atMost(3, TimeUnit.SECONDS).until(() -> 
            client.getReceivedMessages().stream().anyMatch(msg -> msg.contains("ERROR"))
        );

        String errorJson = client.getReceivedMessages().stream()
            .filter(msg -> msg.contains("ERROR"))
            .findFirst()
            .orElseThrow();

        ErrorMessage error = objectMapper.readValue(errorJson, ErrorMessage.class);
        assertThat(error.getType()).isEqualTo(WsMessageType.ERROR);
        assertThat(error.getCode()).isEqualTo("INVALID_MESSAGE");

        client.disconnect();
    }

    // Helper methods for mocking OpenVidu API

    private void mockOpenViduCreateSession(String sessionId) {
        OpenViduSessionResponse response = new OpenViduSessionResponse();
        response.setId(sessionId);
        response.setObject("session");
        response.setCreatedAt(System.currentTimeMillis());

        try {
            String json = objectMapper.writeValueAsString(response);
            mockOpenViduServer.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(json));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private void mockOpenViduCreateToken(String token) {
        OpenViduTokenResponse response = new OpenViduTokenResponse();
        response.setId("con_" + System.currentTimeMillis());
        response.setToken(token);
        response.setCreatedAt(System.currentTimeMillis());

        try {
            String json = objectMapper.writeValueAsString(response);
            mockOpenViduServer.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(json));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
