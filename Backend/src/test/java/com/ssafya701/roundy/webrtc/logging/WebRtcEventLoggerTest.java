package com.ssafya701.roundy.webrtc.logging;

import com.ssafya701.roundy.webrtc.room.ParticipantState;
import com.ssafya701.roundy.webrtc.room.RoomState;
import com.ssafya701.roundy.webrtc.room.enums.RotationMode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.adapter.standard.StandardWebSocketSession;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WebRtcEventLogger 단위 테스트
 */
class WebRtcEventLoggerTest {

    private WebRtcEventLogger eventLogger;

    @BeforeEach
    void setUp() {
        eventLogger = new WebRtcEventLogger();
        eventLogger.resetCounters();
    }

    @Test
    @DisplayName("연결 성공 로깅")
    void testLogConnectionEstablished() {
        // Given
        String sessionId = "session-001";
        Long userId = 1L;
        String username = "testUser";

        // When
        eventLogger.logConnectionEstablished(sessionId, userId, username);

        // Then
        assertThat(eventLogger.getTotalEventCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("연결 종료 로깅")
    void testLogConnectionClosed() {
        // Given
        String sessionId = "session-001";
        Long userId = 1L;
        String reason = "NORMAL";

        // When
        eventLogger.logConnectionClosed(sessionId, userId, reason);

        // Then
        assertThat(eventLogger.getTotalEventCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("방 참가 로깅")
    void testLogRoomJoined() {
        // Given
        String roomId = "room-001";
        Long userId = 1L;
        String username = "testUser";
        int participantCount = 3;

        // When
        eventLogger.logRoomJoined(roomId, userId, username, participantCount);

        // Then
        assertThat(eventLogger.getTotalEventCount()).isEqualTo(1);
        assertThat(eventLogger.getRoomEventCount(roomId)).isEqualTo(1);
    }

    @Test
    @DisplayName("방 퇴장 로깅")
    void testLogRoomLeft() {
        // Given
        String roomId = "room-001";
        Long userId = 1L;
        int remainingParticipants = 2;

        // When
        eventLogger.logRoomLeft(roomId, userId, remainingParticipants);

        // Then
        assertThat(eventLogger.getTotalEventCount()).isEqualTo(1);
        assertThat(eventLogger.getRoomEventCount(roomId)).isEqualTo(1);
    }

    @Test
    @DisplayName("방 생성 로깅")
    void testLogRoomCreated() {
        // Given
        String roomId = "room-001";
        String mode = "PAIR_ONLY";
        String openViduSessionId = "session-001";

        // When
        eventLogger.logRoomCreated(roomId, mode, openViduSessionId);

        // Then
        assertThat(eventLogger.getTotalEventCount()).isEqualTo(1);
        assertThat(eventLogger.getRoomEventCount(roomId)).isEqualTo(1);
    }

    @Test
    @DisplayName("방 삭제 로깅")
    void testLogRoomDeleted() {
        // Given
        String roomId = "room-001";
        eventLogger.logRoomCreated(roomId, "FREE_TALK", "session-001");
        eventLogger.logRoomJoined(roomId, 1L, "user1", 1);

        // When
        eventLogger.logRoomDeleted(roomId);

        // Then
        assertThat(eventLogger.getTotalEventCount()).isEqualTo(3);
        assertThat(eventLogger.getRoomEventCount(roomId)).isEqualTo(0); // 삭제 후 카운터 제거
    }

    @Test
    @DisplayName("라운드 시작 로깅")
    void testLogRoundStarted() {
        // Given
        String roomId = "room-001";
        int roundNumber = 1;
        int totalRounds = 3;
        int durationSeconds = 300;
        int participantCount = 4;

        // When
        eventLogger.logRoundStarted(roomId, roundNumber, totalRounds, durationSeconds, participantCount);

        // Then
        assertThat(eventLogger.getTotalEventCount()).isEqualTo(1);
        assertThat(eventLogger.getRoomEventCount(roomId)).isEqualTo(1);
    }

    @Test
    @DisplayName("라운드 종료 로깅")
    void testLogRoundEnded() {
        // Given
        String roomId = "room-001";
        int roundNumber = 1;
        int totalRounds = 3;

        // When
        eventLogger.logRoundEnded(roomId, roundNumber, totalRounds);

        // Then
        assertThat(eventLogger.getTotalEventCount()).isEqualTo(1);
        assertThat(eventLogger.getRoomEventCount(roomId)).isEqualTo(1);
    }

    @Test
    @DisplayName("페어 배정 로깅")
    void testLogPairsAssigned() {
        // Given
        String roomId = "room-001";
        int roundNumber = 1;
        Map<Long, Long> pairMap = new HashMap<>();
        pairMap.put(1L, 2L);
        pairMap.put(2L, 1L);
        pairMap.put(3L, 4L);
        pairMap.put(4L, 3L);

        // When
        eventLogger.logPairsAssigned(roomId, roundNumber, pairMap);

        // Then
        assertThat(eventLogger.getTotalEventCount()).isEqualTo(1);
        assertThat(eventLogger.getRoomEventCount(roomId)).isEqualTo(1);
    }

    @Test
    @DisplayName("OpenVidu Session 생성 로깅")
    void testLogOpenViduSessionCreated() {
        // Given
        String roomId = "room-001";
        String sessionId = "session-001";

        // When
        eventLogger.logOpenViduSessionCreated(roomId, sessionId);

        // Then
        assertThat(eventLogger.getTotalEventCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("OpenVidu Token 발급 로깅")
    void testLogOpenViduTokenGenerated() {
        // Given
        String roomId = "room-001";
        Long userId = 1L;
        String connectionId = "con-001";

        // When
        eventLogger.logOpenViduTokenGenerated(roomId, userId, connectionId);

        // Then
        assertThat(eventLogger.getTotalEventCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("에러 로깅")
    void testLogError() {
        // Given
        String context = "JOIN_ROOM";
        String errorCode = "OPENVIDU_ERROR";
        String errorMessage = "Failed to create session";
        Long userId = 1L;

        // When
        eventLogger.logError(context, errorCode, errorMessage, userId);

        // Then
        assertThat(eventLogger.getTotalEventCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("로테이션 시작 로깅")
    void testLogRotationStarted() {
        // Given
        String roomId = "room-001";
        int totalRounds = 3;
        int participantCount = 4;

        // When
        eventLogger.logRotationStarted(roomId, totalRounds, participantCount);

        // Then
        assertThat(eventLogger.getTotalEventCount()).isEqualTo(1);
        assertThat(eventLogger.getRoomEventCount(roomId)).isEqualTo(1);
    }

    @Test
    @DisplayName("로테이션 중지 로깅")
    void testLogRotationStopped() {
        // Given
        String roomId = "room-001";
        String reason = "ALL_PARTICIPANTS_LEFT";

        // When
        eventLogger.logRotationStopped(roomId, reason);

        // Then
        assertThat(eventLogger.getTotalEventCount()).isEqualTo(1);
        assertThat(eventLogger.getRoomEventCount(roomId)).isEqualTo(1);
    }

    @Test
    @DisplayName("통계 로깅")
    void testLogStatistics() {
        // Given
        int totalRooms = 5;
        int totalParticipants = 15;
        int activeRotations = 2;

        // When
        eventLogger.logStatistics(totalRooms, totalParticipants, activeRotations);

        // Then
        assertThat(eventLogger.getTotalEventCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("여러 방의 이벤트 카운터 독립성")
    void testMultipleRoomEventCounters() {
        // Given
        String room1 = "room-001";
        String room2 = "room-002";

        // When
        eventLogger.logRoomCreated(room1, "FREE_TALK", "session-001");
        eventLogger.logRoomJoined(room1, 1L, "user1", 1);
        eventLogger.logRoomJoined(room1, 2L, "user2", 2);

        eventLogger.logRoomCreated(room2, "PAIR_ONLY", "session-002");
        eventLogger.logRoomJoined(room2, 3L, "user3", 1);

        // Then
        assertThat(eventLogger.getRoomEventCount(room1)).isEqualTo(3);
        assertThat(eventLogger.getRoomEventCount(room2)).isEqualTo(2);
        assertThat(eventLogger.getTotalEventCount()).isEqualTo(5);
    }

    @Test
    @DisplayName("카운터 리셋")
    void testResetCounters() {
        // Given
        eventLogger.logRoomCreated("room-001", "FREE_TALK", "session-001");
        eventLogger.logRoomJoined("room-001", 1L, "user1", 1);
        assertThat(eventLogger.getTotalEventCount()).isGreaterThan(0);

        // When
        eventLogger.resetCounters();

        // Then
        assertThat(eventLogger.getTotalEventCount()).isZero();
        assertThat(eventLogger.getRoomEventCount("room-001")).isZero();
    }

    @Test
    @DisplayName("브로드캐스트 로깅")
    void testLogBroadcast() {
        // Given
        String roomId = "room-001";
        String messageType = "ROOM_STATE";
        int recipientCount = 5;

        // When
        eventLogger.logBroadcast(roomId, messageType, recipientCount);

        // Then
        assertThat(eventLogger.getTotalEventCount()).isEqualTo(1);
    }
}
