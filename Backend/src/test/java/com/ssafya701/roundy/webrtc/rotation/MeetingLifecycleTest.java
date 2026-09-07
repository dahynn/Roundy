package com.ssafya701.roundy.webrtc.rotation;

import com.ssafya701.roundy.match.repository.SessionRepository;
import com.ssafya701.roundy.match.service.MatchService;
import com.ssafya701.roundy.session.service.SessionService;
import com.ssafya701.roundy.webrtc.game.GameQuestionRepository;
import com.ssafya701.roundy.webrtc.room.RoomRegistry;
import com.ssafya701.roundy.webrtc.room.RoomState;
import com.ssafya701.roundy.webrtc.room.enums.Gender;
import com.ssafya701.roundy.webrtc.room.enums.RotationMode;
import com.ssafya701.roundy.webrtc.room.enums.Stage;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.WebSocketSession;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MeetingLifecycleTest {
    @Test
    void sixParticipantsCompleteAllRoundsAndAreCleanedUpOnlyAfterFaceReveal() throws Exception {
        RoomEventPublisher publisher = mock(RoomEventPublisher.class);
        MatchService matches = mock(MatchService.class);
        SessionService queue = mock(SessionService.class);
        RoomRegistry registry = mock(RoomRegistry.class);
        StageExecutor stages = new StageExecutor(publisher, matches, queue, mock(GameQuestionRepository.class), registry);
        VirtualClock clock = new VirtualClock();
        StageScheduler scheduler = new StageScheduler(publisher, stages, mock(SessionRepository.class), clock.executor);
        RoomState room = new RoomState("six-person-room", RotationMode.PAIR_ONLY, "video-room");
        room.setDbSessionId(1L);
        List<WebSocketSession> sockets = new ArrayList<>();
        for (long id = 1; id <= 6; id++) {
            WebSocketSession socket = mock(WebSocketSession.class);
            sockets.add(socket);
            room.addParticipant(id, "user-" + id, id % 2 == 1 ? Gender.MALE : Gender.FEMALE, socket);
        }

        try {
            scheduler.startStageRotation(room);
            clock.until(() -> room.getCurrentStage() == Stage.VOTE_FINAL);
            for (long id = 1; id <= 6; id++) room.submitVote(id, id % 2 == 1 ? id + 1 : id - 1, true);
            clock.until(() -> room.getCurrentStage() == Stage.FACE_REVEAL);

            assertThat(room.getParticipantCount()).isEqualTo(6);
            assertThat(room.getMatchedCouples()).hasSize(3);
            verify(publisher, times(6)).publishSpeakerChange(eq(room), anyLong(), eq(Stage.SELF_INTRO.getDurationSeconds()));
            verify(publisher, times(6)).publishPairAssignments(eq(room), anyInt(), anyMap());
            verify(matches, times(3)).createMatch(eq(1L), anyLong(), anyLong());
            verify(publisher).publishLobbyConnections(room);
            verify(queue, never()).cleanupRoom(anyString());
            verify(registry, never()).removeRoom(anyString());

            // 얼굴 공개 준비 대기 종료 → START_TIMER. 아직 데이터가 유지되어야 한다.
            clock.next();
            assertThat(room.getCurrentStage()).isEqualTo(Stage.FACE_REVEAL);
            verify(queue, never()).cleanupRoom(anyString());
            long startedAt = clock.now;
            clock.next();

            assertThat(clock.now - startedAt).isEqualTo(Stage.FACE_REVEAL.getDurationSeconds());
            verify(queue).cleanupRoom("six-person-room");
            verify(registry).removeRoom("six-person-room");
            for (var socket : sockets) verify(socket).close(any());
            assertThat(scheduler.isActive(room.getRoomId())).isFalse();
        } finally {
            scheduler.shutdown();
            stages.shutdown();
        }
    }

    /** 실제로 수분을 기다리지 않고 서버가 예약한 순서와 시간을 그대로 실행한다. */
    private static class VirtualClock {
        final ScheduledExecutorService executor = mock(ScheduledExecutorService.class);
        final List<Task> tasks = new ArrayList<>();
        long now;

        VirtualClock() {
            doAnswer(call -> {
                Task task = new Task(call.getArgument(0), now + (long) call.getArgument(1));
                tasks.add(task);
                return task.future;
            }).when(executor).schedule(any(Runnable.class), anyLong(), eq(TimeUnit.SECONDS));
        }

        void next() {
            Task task = tasks.stream().filter(t -> !t.cancelled)
                    .min(Comparator.comparingLong(t -> t.due)).orElseThrow();
            tasks.remove(task);
            now = task.due;
            task.action.run();
        }

        void until(java.util.function.BooleanSupplier condition) {
            for (int i = 0; i < 100 && !condition.getAsBoolean(); i++) next();
            assertThat(condition.getAsBoolean()).isTrue();
        }

        private static class Task {
            final Runnable action;
            final long due;
            final ScheduledFuture<?> future = mock(ScheduledFuture.class);
            boolean cancelled;
            Task(Runnable action, long due) {
                this.action = action;
                this.due = due;
                when(future.cancel(anyBoolean())).thenAnswer(call -> { cancelled = true; return true; });
            }
        }
    }
}
