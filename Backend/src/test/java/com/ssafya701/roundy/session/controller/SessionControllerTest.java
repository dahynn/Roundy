package com.ssafya701.roundy.session.controller;

import com.ssafya701.roundy.auth.entity.User;
import com.ssafya701.roundy.auth.enums.GenderType;
import com.ssafya701.roundy.auth.repository.UserRepository;
import com.ssafya701.roundy.global.jwt.JwtTokenProvider;
import com.ssafya701.roundy.session.dto.RoomMatchResult;
import com.ssafya701.roundy.session.dto.request.SessionEnterRequest;
import com.ssafya701.roundy.session.dto.response.RoomMemberInfo;
import com.ssafya701.roundy.session.service.SessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SessionControllerTest {
    @Mock private SessionService sessionService;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private UserRepository userRepository;
    private SessionController controller;

    @BeforeEach
    void setUp() {
        controller = new SessionController(sessionService, jwtTokenProvider, userRepository);
        when(jwtTokenProvider.getUserId("jwt-token")).thenReturn(7L);
        lenient().when(userRepository.findById(7L)).thenReturn(Optional.of(
                User.builder().kakaoId(77L).gender(GenderType.FEMALE).build()));
    }

    @Test
    void forwardsAuthenticatedUserAndRequestToAtomicEntry() {
        when(sessionService.addToQueueAndMatch(7L, GenderType.FEMALE, "verification-1"))
                .thenReturn(RoomMatchResult.waiting(0, 1));
        when(sessionService.getQueuePosition(7L, GenderType.FEMALE)).thenReturn(1);
        var response = controller.enterSession("Bearer jwt-token", new SessionEnterRequest("verification-1"));
        assertThat(response.getBody().getData().isSuccess()).isTrue();
        assertThat(response.getBody().getData().getQueuePosition()).isEqualTo(1);
    }

    @Test
    void rejectedVerificationReturnsReverificationResult() {
        when(sessionService.addToQueueAndMatch(7L, GenderType.FEMALE, null)).thenReturn(RoomMatchResult.rejected());
        assertThat(controller.enterSession("Bearer jwt-token", null).getBody().getData().isSuccess()).isFalse();
    }

    @Test
    void pollingAnExistingMatchReturnsTheAssignedRoom() {
        when(sessionService.addToQueueAndMatch(7L, GenderType.FEMALE, null))
                .thenReturn(RoomMatchResult.matched("room-1", List.of(), List.of()));
        when(sessionService.getRoomMemberInfo(7L, "room-1")).thenReturn(new RoomMemberInfo("room-1", "FEMALE"));
        assertThat(controller.enterSession("Bearer jwt-token", null).getBody().getData().getRoomId()).isEqualTo("room-1");
    }

    @Test
    void leavingAnAlreadyEmptyQueueIsIdempotent() {
        when(sessionService.removeFromQueue(7L, GenderType.FEMALE)).thenReturn(false);
        assertThat(controller.leaveSession("Bearer jwt-token").getBody().isSuccess()).isTrue();
    }

    @Test
    void outsidersCannotReadRoomMembers() {
        assertThat(controller.getRoomMembers("Bearer jwt-token", "someone-elses-room").getStatusCode().value()).isEqualTo(403);
        verify(sessionService, never()).getRoomMembers(anyString());
    }

    @Test
    void outsidersCannotReadTheirOwnInfoForAnotherRoom() {
        assertThat(controller.getMyRoomInfo("Bearer jwt-token", "someone-elses-room").getStatusCode().value()).isEqualTo(403);
        verify(sessionService, never()).getRoomMemberInfo(anyLong(), anyString());
    }

    @Test
    void activeMemberCanReadRoomMembers() {
        when(sessionService.hasActiveRoomAccess(7L, "room-1")).thenReturn(true);
        when(sessionService.getRoomMembers("room-1"))
                .thenReturn(new com.ssafya701.roundy.session.dto.response.RoomMembersResponse("room-1", List.of(), List.of()));

        assertThat(controller.getRoomMembers("Bearer jwt-token", "room-1").getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    void roomAccessRequiresTheCurrentActiveMatch() {
        when(sessionService.hasActiveRoomAccess(7L, "ended-room")).thenReturn(false);

        assertThat(controller.getMyRoomInfo("Bearer jwt-token", "ended-room").getStatusCode().value()).isEqualTo(403);
    }
}
