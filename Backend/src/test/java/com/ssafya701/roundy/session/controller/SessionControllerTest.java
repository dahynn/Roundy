package com.ssafya701.roundy.session.controller;

import com.ssafya701.roundy.auth.entity.User;
import com.ssafya701.roundy.auth.enums.GenderType;
import com.ssafya701.roundy.auth.repository.UserRepository;
import com.ssafya701.roundy.global.common.CommonResponse;
import com.ssafya701.roundy.global.jwt.JwtTokenProvider;
import com.ssafya701.roundy.session.dto.RoomMatchResult;
import com.ssafya701.roundy.session.dto.request.SessionEnterRequest;
import com.ssafya701.roundy.session.dto.response.SessionEnterResponse;
import com.ssafya701.roundy.session.service.SessionService;
import com.ssafya701.roundy.verification.service.VerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SessionControllerTest {

    @Mock
    private SessionService sessionService;

    @Mock
    private VerificationService verificationService;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private UserRepository userRepository;

    private SessionController controller;

    @BeforeEach
    void setUp() {
        controller = new SessionController(sessionService, verificationService, jwtTokenProvider, userRepository);
        when(jwtTokenProvider.getUserId("jwt-token")).thenReturn(7L);
        when(userRepository.findById(7L)).thenReturn(Optional.of(
                User.builder().kakaoId(77L).gender(GenderType.FEMALE).build()));
    }

    @Test
    void firstQueueEntryRequiresAndConsumesSuccessfulVerification() {
        SessionEnterRequest request = request("verification-1");
        when(sessionService.getUserCurrentRoom(7L)).thenReturn(null);
        when(sessionService.isInQueue(7L, GenderType.FEMALE)).thenReturn(false);
        when(verificationService.verifyAndDelete("verification-1")).thenReturn(true);
        when(sessionService.addToQueueAndMatch(7L, GenderType.FEMALE))
                .thenReturn(RoomMatchResult.waiting(0, 1));
        when(sessionService.getQueuePosition(7L, GenderType.FEMALE)).thenReturn(1);

        ResponseEntity<CommonResponse<SessionEnterResponse>> response =
                controller.enterSession("Bearer jwt-token", request);

        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().isSuccess()).isTrue();
        assertThat(response.getBody().getData().getQueuePosition()).isEqualTo(1);
        verify(verificationService).verifyAndDelete("verification-1");
    }

    @Test
    void firstQueueEntryIsRejectedWhenVerificationIsMissing() {
        when(sessionService.getUserCurrentRoom(7L)).thenReturn(null);
        when(sessionService.isInQueue(7L, GenderType.FEMALE)).thenReturn(false);
        when(verificationService.verifyAndDelete(null)).thenReturn(false);

        ResponseEntity<CommonResponse<SessionEnterResponse>> response =
                controller.enterSession("Bearer jwt-token", null);

        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().isSuccess()).isFalse();
        verify(sessionService, never()).addToQueueAndMatch(any(), any());
    }

    @Test
    void pollingForExistingQueueMemberDoesNotConsumeVerificationAgain() {
        when(sessionService.getUserCurrentRoom(7L)).thenReturn(null);
        when(sessionService.isInQueue(7L, GenderType.FEMALE)).thenReturn(true);
        when(sessionService.addToQueueAndMatch(7L, GenderType.FEMALE))
                .thenReturn(RoomMatchResult.waiting(0, 1));
        when(sessionService.getQueuePosition(7L, GenderType.FEMALE)).thenReturn(1);

        ResponseEntity<CommonResponse<SessionEnterResponse>> response =
                controller.enterSession("Bearer jwt-token", null);

        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().isSuccess()).isTrue();
        verify(verificationService, never()).verifyAndDelete(any());
    }

    private SessionEnterRequest request(String requestId) {
        return new SessionEnterRequest(requestId);
    }
}
