package com.ssafya701.roundy.webrtc.service;

import com.ssafya701.roundy.webrtc.openvidu.OpenViduClient;
import com.ssafya701.roundy.webrtc.openvidu.OpenViduService;
import com.ssafya701.roundy.webrtc.openvidu.dto.OpenViduSessionResponse;
import com.ssafya701.roundy.webrtc.room.RoomRegistry;
import com.ssafya701.roundy.webrtc.room.RoomState;
import com.ssafya701.roundy.webrtc.room.enums.RotationMode;
import com.ssafya701.roundy.webrtc.rotation.RotationScheduler;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.io.IOException;
import java.util.Collection;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WebRtcRoomService 단위 테스트
 */
@SpringBootTest
@TestPropertySource(properties = {
        "openvidu.url=http://localhost:8080",
        "openvidu.secret=test-secret"
})
class WebRtcRoomServiceTest {

    @Autowired
    private WebRtcRoomService roomService;

    @Autowired
    private RoomRegistry roomRegistry;

    @Autowired
    private RotationScheduler rotationScheduler;

    private MockWebServer mockWebServer;

    @BeforeEach
    void setUp() throws IOException {
        // MockWebServer 시작
        mockWebServer = new MockWebServer();
        mockWebServer.start(8080);

        // 레지스트리 초기화
        roomRegistry.clear();
    }

    @AfterEach
    void tearDown() throws IOException {
        // MockWebServer 종료
        if (mockWebServer != null) {
            mockWebServer.shutdown();
        }

        // 레지스트리 정리
        roomRegistry.clear();
    }

    @Test
    @DisplayName("방 생성 또는 조회 - FREE_TALK 모드")
    void testGetOrCreateRoomFreeTalk() {
        // Given
        String roomId = "room-001";
        mockOpenViduSession(roomId);

        // When
        RoomState room = roomService.getOrCreateRoom(roomId, RotationMode.FREE_TALK);

        // Then
        assertThat(room).isNotNull();
        assertThat(room.getRoomId()).isEqualTo(roomId);
        assertThat(room.getMode()).isEqualTo(RotationMode.FREE_TALK);
        assertThat(roomService.hasRoom(roomId)).isTrue();
    }

    @Test
    @DisplayName("방 생성 또는 조회 - PAIR_ONLY 모드")
    void testGetOrCreateRoomPairOnly() {
        // Given
        String roomId = "room-002";
        mockOpenViduSession(roomId);

        // When
        RoomState room = roomService.getOrCreateRoom(roomId, RotationMode.PAIR_ONLY);

        // Then
        assertThat(room).isNotNull();
        assertThat(room.getRoomId()).isEqualTo(roomId);
        assertThat(room.getMode()).isEqualTo(RotationMode.PAIR_ONLY);
        assertThat(room.isPairMode()).isTrue();
    }

    @Test
    @DisplayName("방 조회 - 존재하는 방")
    void testGetRoomExists() {
        // Given
        String roomId = "room-003";
        mockOpenViduSession(roomId);
        roomService.getOrCreateRoom(roomId, RotationMode.FREE_TALK);

        // When
        Optional<RoomState> roomOpt = roomService.getRoom(roomId);

        // Then
        assertThat(roomOpt).isPresent();
        assertThat(roomOpt.get().getRoomId()).isEqualTo(roomId);
    }

    @Test
    @DisplayName("방 조회 - 존재하지 않는 방")
    void testGetRoomNotExists() {
        // Given
        String roomId = "non-existent-room";

        // When
        Optional<RoomState> roomOpt = roomService.getRoom(roomId);

        // Then
        assertThat(roomOpt).isEmpty();
    }

    @Test
    @DisplayName("방 삭제")
    void testRemoveRoom() {
        // Given
        String roomId = "room-004";
        mockOpenViduSession(roomId);
        roomService.getOrCreateRoom(roomId, RotationMode.FREE_TALK);
        assertThat(roomService.hasRoom(roomId)).isTrue();

        // When
        roomService.removeRoom(roomId);

        // Then
        assertThat(roomService.hasRoom(roomId)).isFalse();
    }

    @Test
    @DisplayName("모든 방 조회")
    void testGetAllRooms() {
        // Given
        mockOpenViduSession("room-1");
        mockOpenViduSession("room-2");
        mockOpenViduSession("room-3");

        roomService.getOrCreateRoom("room-1", RotationMode.FREE_TALK);
        roomService.getOrCreateRoom("room-2", RotationMode.PAIR_ONLY);
        roomService.getOrCreateRoom("room-3", RotationMode.FREE_TALK);

        // When
        Collection<RoomState> rooms = roomService.getAllRooms();

        // Then
        assertThat(rooms).hasSize(3);
    }

    @Test
    @DisplayName("방 개수 조회")
    void testGetRoomCount() {
        // Given
        mockOpenViduSession("room-1");
        mockOpenViduSession("room-2");

        roomService.getOrCreateRoom("room-1", RotationMode.FREE_TALK);
        roomService.getOrCreateRoom("room-2", RotationMode.PAIR_ONLY);

        // When
        int count = roomService.getRoomCount();

        // Then
        assertThat(count).isEqualTo(2);
    }

    @Test
    @DisplayName("방 통계 조회")
    void testGetStatistics() {
        // Given
        mockOpenViduSession("room-1");
        mockOpenViduSession("room-2");

        roomService.getOrCreateRoom("room-1", RotationMode.FREE_TALK);
        roomService.getOrCreateRoom("room-2", RotationMode.PAIR_ONLY);

        // When
        WebRtcRoomService.RoomStatistics stats = roomService.getStatistics();

        // Then
        assertThat(stats.totalRooms()).isEqualTo(2);
        assertThat(stats.freeTalkRooms()).isEqualTo(1);
        assertThat(stats.pairModeRooms()).isEqualTo(1);
        assertThat(stats.totalParticipants()).isEqualTo(0);
        assertThat(stats.activeRotations()).isEqualTo(0);
    }

    @Test
    @DisplayName("로테이션 활성 여부 확인")
    void testIsRotationActive() {
        // Given
        String roomId = "room-rotation";
        mockOpenViduSession(roomId);
        roomService.getOrCreateRoom(roomId, RotationMode.PAIR_ONLY);

        // When & Then
        assertThat(roomService.isRotationActive(roomId)).isFalse();
    }

    @Test
    @DisplayName("FREE_TALK 모드는 로테이션 시작 불가")
    void testStartRotationFreeTalkMode() {
        // Given
        String roomId = "room-freetalk";
        mockOpenViduSession(roomId);
        roomService.getOrCreateRoom(roomId, RotationMode.FREE_TALK);

        // When
        roomService.startRotation(roomId, 3);

        // Then
        assertThat(roomService.isRotationActive(roomId)).isFalse();
    }

    @Test
    @DisplayName("참가자 수 조회")
    void testGetParticipantCount() {
        // Given
        String roomId = "room-005";
        mockOpenViduSession(roomId);
        roomService.getOrCreateRoom(roomId, RotationMode.FREE_TALK);

        // When
        int count = roomService.getParticipantCount(roomId);

        // Then
        assertThat(count).isZero();
    }

    // ==================== Helper Methods ====================

    /**
     * OpenVidu Session Mock 설정
     */
    private void mockOpenViduSession(String roomId) {
        mockWebServer.enqueue(new MockResponse()
                .setResponseCode(200)
                .setBody("{\"id\":\"" + roomId + "\",\"object\":\"session\",\"createdAt\":1234567890}"));
    }
}
