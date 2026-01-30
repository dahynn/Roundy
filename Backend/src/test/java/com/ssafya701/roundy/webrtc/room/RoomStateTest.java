package com.ssafya701.roundy.webrtc.room;

import com.ssafya701.roundy.webrtc.room.enums.RotationMode;
import com.ssafya701.roundy.webrtc.room.enums.Stage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.WebSocketSession;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * RoomState 단위 테스트
 */
@DisplayName("RoomState 테스트")
class RoomStateTest {
    
    private RoomState roomState;
    private WebSocketSession mockSession1;
    private WebSocketSession mockSession2;
    private WebSocketSession mockSession3;
    
    @BeforeEach
    void setUp() {
        roomState = new RoomState("test-room", RotationMode.PAIR_ONLY, "openvidu-session");
        mockSession1 = mock(WebSocketSession.class);
        mockSession2 = mock(WebSocketSession.class);
        mockSession3 = mock(WebSocketSession.class);
        
        when(mockSession1.getId()).thenReturn("session-1");
        when(mockSession2.getId()).thenReturn("session-2");
        when(mockSession3.getId()).thenReturn("session-3");
    }
    
    @Test
    @DisplayName("투표 제출이 올바르게 저장된다")
    void testSubmitVote() {
        // 첫인상 투표
        roomState.submitVote(1L, 2L, false);
        roomState.submitVote(2L, 1L, false);
        
        // 최종 투표
        roomState.submitVote(1L, 2L, true);
        roomState.submitVote(2L, 1L, true);
        
        // 검증은 getMatchResultForUser로 간접 확인
        assertThat(roomState.getMatchResultForUser(1L)).isNotNull();
    }
    
    @Test
    @DisplayName("쌍방 매칭이 올바르게 계산된다")
    void testCalculateMatches() {
        // Given: 참가자 추가
        roomState.addParticipant(1L, "Alice", mockSession1);
        roomState.addParticipant(2L, "Bob", mockSession2);
        roomState.addParticipant(3L, "Charlie", mockSession3);
        
        // When: 쌍방 투표
        roomState.submitVote(1L, 2L, true); // Alice → Bob
        roomState.submitVote(2L, 1L, true); // Bob → Alice (매칭 성공!)
        roomState.submitVote(3L, 1L, true); // Charlie → Alice (일방적)
        
        // Then: 매칭 결과 확인
        List<RoomState.MatchPair> matches = roomState.calculateMatches();
        
        assertThat(matches).hasSize(1);
        assertThat(matches.get(0).isMatched()).isTrue();
        assertThat(matches.get(0).getUserId1()).isIn(1L, 2L);
        assertThat(matches.get(0).getUserId2()).isIn(1L, 2L);
    }
    
    @Test
    @DisplayName("매칭 실패 시 isMatched가 false이다")
    void testCalculateMatchesWithNoMatch() {
        // Given: 참가자 추가
        roomState.addParticipant(1L, "Alice", mockSession1);
        roomState.addParticipant(2L, "Bob", mockSession2);
        
        // When: 일방적 투표만 있음
        roomState.submitVote(1L, 2L, true); // Alice → Bob
        // Bob은 투표 안함
        
        // Then: Alice는 매칭 실패
        RoomState.MatchPair result = roomState.getMatchResultForUser(1L);
        assertThat(result.isMatched()).isFalse();
        assertThat(result.getPartnerId(1L)).isNull();
    }
    
    @Test
    @DisplayName("발언자 큐가 랜덤하게 초기화된다")
    void testInitializeSpeakerQueue() {
        // Given
        roomState.addParticipant(1L, "Alice", mockSession1);
        roomState.addParticipant(2L, "Bob", mockSession2);
        roomState.addParticipant(3L, "Charlie", mockSession3);
        
        // When
        roomState.initializeSpeakerQueue();
        
        // Then: 큐가 비어있지 않고, 다음 발언자를 지정할 수 있다
        Long speaker1 = roomState.assignNextSpeaker();
        Long speaker2 = roomState.assignNextSpeaker();
        Long speaker3 = roomState.assignNextSpeaker();
        
        assertThat(speaker1).isNotNull();
        assertThat(speaker2).isNotNull();
        assertThat(speaker3).isNotNull();
        assertThat(speaker1).isNotEqualTo(speaker2);
        
        // 모든 참가자가 한 번씩 발언
        assertThat(roomState.getRemainingspeakers()).isZero();
    }
    
    @Test
    @DisplayName("Stage 전환이 올바르게 동작한다")
    void testMoveToNextStage() {
        // Given
        roomState.setCurrentStage(Stage.SELF_INTRO);
        
        // When
        Stage next1 = roomState.moveToNextStage();
        Stage next2 = roomState.moveToNextStage();
        
        // Then
        assertThat(next1).isEqualTo(Stage.VOTE_FIRST);
        assertThat(next2).isEqualTo(Stage.ROTATION_SHORT);
        assertThat(roomState.getCurrentStage()).isEqualTo(Stage.ROTATION_SHORT);
    }
    
    @Test
    @DisplayName("페어링 정보가 올바르게 저장되고 조회된다")
    void testCurrentPairing() {
        // Given
        roomState.addParticipant(1L, "Alice", mockSession1);
        roomState.addParticipant(2L, "Bob", mockSession2);
        
        java.util.Map<Long, Long> pairMap = new java.util.HashMap<>();
        pairMap.put(1L, 2L);
        pairMap.put(2L, 1L);
        
        // When
        roomState.setCurrentPairing(pairMap);
        
        // Then
        assertThat(roomState.getPartnerId(1L)).isEqualTo(2L);
        assertThat(roomState.getPartnerId(2L)).isEqualTo(1L);
    }
    
    @Test
    @DisplayName("clearStageData()가 모든 데이터를 초기화한다")
    void testClearStageData() {
        // Given
        roomState.submitVote(1L, 2L, false);
        roomState.submitVote(1L, 2L, true);
        roomState.submitGameAnswer(1L, "CREATIVE");
        roomState.initializeSpeakerQueue();
        
        // When
        roomState.clearStageData();
        
        // Then
        List<RoomState.MatchPair> matches = roomState.calculateMatches();
        assertThat(matches).isEmpty();
    }
}
