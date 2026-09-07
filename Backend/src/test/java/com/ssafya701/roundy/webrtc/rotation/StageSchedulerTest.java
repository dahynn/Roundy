package com.ssafya701.roundy.webrtc.rotation;

import com.ssafya701.roundy.match.repository.SessionRepository;
import com.ssafya701.roundy.webrtc.room.RoomState;
import com.ssafya701.roundy.webrtc.room.enums.Gender;
import com.ssafya701.roundy.webrtc.room.enums.RotationMode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.WebSocketSession;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class StageSchedulerTest {
    private final RoomEventPublisher publisher = mock(RoomEventPublisher.class);
    private final StageExecutor stages = mock(StageExecutor.class);
    private final ScheduledExecutorService executor = mock(ScheduledExecutorService.class);
    private final List<Runnable> tasks = new ArrayList<>();
    private StageScheduler scheduler;
    private RoomState room;

    @BeforeEach
    void setUp() {
        doAnswer(call -> {
            tasks.add(call.getArgument(0));
            return mock(ScheduledFuture.class);
        }).when(executor).schedule(any(Runnable.class), anyLong(), any(TimeUnit.class));
        scheduler = new StageScheduler(publisher, stages, mock(SessionRepository.class), executor);
        room = new RoomState("room-1", RotationMode.PAIR_ONLY, "video-1");
        room.addParticipant(1L, "one", Gender.MALE, mock(WebSocketSession.class));
        room.addParticipant(2L, "two", Gender.FEMALE, mock(WebSocketSession.class));
    }

    @Test
    void registersReadinessBeforePublishingStageAndStartsTimerOnlyOnce() {
        doAnswer(call -> {
            long sequence = room.getStageSequence();
            assertThat(room.markUserReady(1L, sequence)).isFalse();
            assertThat(room.markUserReady(2L, sequence)).isTrue();
            scheduler.completeSynchronization(room, sequence);
            return null;
        }).when(stages).executeBreak(room);

        scheduler.startStageRotation(room);
        scheduler.completeSynchronization(room, room.getStageSequence());
        tasks.getFirst().run(); // 취소 직전 실행에 들어온 timeout도 중복 시작하지 않는다.
        verify(publisher, times(1)).publishStartTimer(room, 10);
        assertThat(tasks).hasSize(2);
    }

    @Test
    void concurrentCompletionsScheduleOnlyOneStageEnd() throws Exception {
        scheduler.startStageRotation(room);
        long sequence = room.getStageSequence();
        try (var workers = Executors.newFixedThreadPool(8)) {
            var calls = IntStream.range(0, 16).<Callable<Void>>mapToObj(i -> () -> {
                scheduler.completeSynchronization(room, sequence);
                return null;
            }).toList();
            for (var result : workers.invokeAll(calls)) result.get();
        }
        verify(publisher, times(1)).publishStartTimer(room, 10);
        assertThat(tasks).hasSize(2);
    }

    @Test
    void ignoresOldCompletionAndTimeoutAfterTheNextTransition() {
        scheduler.startStageRotation(room);
        long previous = room.getStageSequence();
        scheduler.completeSynchronization(room, previous);
        tasks.get(1).run(); // BREAK 종료 → SELF_INTRO
        assertThat(room.getStageSequence()).isGreaterThan(previous);
        assertThat(room.markUserReady(1L, previous)).isFalse();
        scheduler.completeSynchronization(room, previous);
        tasks.getFirst().run();
        verify(publisher, times(1)).publishStartTimer(room, 10);
    }

    @Test
    void stoppedRoomCannotBeRestartedByALateTimeout() {
        scheduler.startStageRotation(room);
        scheduler.stopStageRotation(room.getRoomId());
        tasks.getFirst().run();
        verify(publisher, never()).publishStartTimer(any(), anyInt());
        assertThat(scheduler.isActive(room.getRoomId())).isFalse();
    }

    @Test
    void duplicateJoinCannotRestartAnActiveStage() {
        scheduler.startStageRotation(room);
        scheduler.startStageRotation(room);
        verify(stages, times(1)).executeBreak(room);
        assertThat(room.getStageSequence()).isEqualTo(1);
    }
}
