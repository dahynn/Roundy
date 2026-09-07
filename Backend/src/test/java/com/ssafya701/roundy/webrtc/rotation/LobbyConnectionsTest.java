package com.ssafya701.roundy.webrtc.rotation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafya701.roundy.webrtc.logging.WebRtcEventLogger;
import com.ssafya701.roundy.webrtc.message.outbound.MediaSessionMessage;
import com.ssafya701.roundy.webrtc.openvidu.OpenViduService;
import com.ssafya701.roundy.webrtc.room.RoomState;
import com.ssafya701.roundy.webrtc.room.enums.Gender;
import com.ssafya701.roundy.webrtc.room.enums.RotationMode;
import com.ssafya701.roundy.webrtc.serializer.WsMessageSerializer;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class LobbyConnectionsTest {
    @Test
    void lobbyReturnCreatesFreshSessionAndSendsEachTokenOnlyToItsOwner() throws Exception {
        var media = mock(OpenViduService.class);
        var serializer = new WsMessageSerializer(new ObjectMapper());
        var publisher = new RoomEventPublisher(serializer, mock(WebRtcEventLogger.class), media);
        var room = new RoomState("room", RotationMode.PAIR_ONLY, "old-lobby");
        var one = mock(WebSocketSession.class);
        var two = mock(WebSocketSession.class);
        when(one.isOpen()).thenReturn(true);
        when(two.isOpen()).thenReturn(true);
        room.addParticipant(1L, "one", Gender.MALE, one);
        room.addParticipant(2L, "two", Gender.FEMALE, two);
        room.initRenderWait(java.util.List.of(1L, 2L));
        String newSession = "room-lobby-" + room.getStageSequence();
        when(media.generateToken(newSession, 1L)).thenReturn("new-token-one");
        when(media.generateToken(newSession, 2L)).thenReturn("new-token-two");
        publisher.publishLobbyConnections(room);
        verify(media).ensureSession(newSession);
        var first = ArgumentCaptor.forClass(TextMessage.class);
        var second = ArgumentCaptor.forClass(TextMessage.class);
        verify(one).sendMessage(first.capture());
        verify(two).sendMessage(second.capture());
        var message = serializer.deserialize(first.getValue().getPayload(), MediaSessionMessage.class);
        assertThat(message.getToken()).isEqualTo("new-token-one");
        assertThat(message.getSessionId()).isEqualTo(newSession);
        assertThat(first.getValue().getPayload()).doesNotContain("new-token-two");
        assertThat(second.getValue().getPayload()).contains("new-token-two").doesNotContain("new-token-one");
    }
}
