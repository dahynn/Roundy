package com.ssafya701.roundy.webrtc.openvidu;

import com.ssafya701.roundy.config.OpenViduProperties;
import com.ssafya701.roundy.webrtc.logging.WebRtcEventLogger;
import com.ssafya701.roundy.webrtc.openvidu.dto.OpenViduSessionResponse;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OpenViduSessionConcurrencyTest {

    @Test
    void concurrentRequestsForSameRoomCreateOneExternalSession() throws Exception {
        OpenViduClient client = mock(OpenViduClient.class);
        CountDownLatch creationEntered = new CountDownLatch(1);
        CountDownLatch releaseCreation = new CountDownLatch(1);
        when(client.createSession("room-burst")).thenAnswer(invocation -> {
            creationEntered.countDown();
            assertThat(releaseCreation.await(2, TimeUnit.SECONDS)).isTrue();
            return session("openvidu-room-burst");
        });
        OpenViduService service = service(client);
        ExecutorService executor = Executors.newFixedThreadPool(16);

        try {
            CountDownLatch start = new CountDownLatch(1);
            List<Future<String>> results = new ArrayList<>();
            for (int index = 0; index < 32; index++) {
                results.add(executor.submit(() -> {
                    start.await();
                    return service.ensureSession("room-burst");
                }));
            }

            start.countDown();
            assertThat(creationEntered.await(2, TimeUnit.SECONDS)).isTrue();
            releaseCreation.countDown();

            for (Future<String> result : results) {
                assertThat(result.get(2, TimeUnit.SECONDS)).isEqualTo("openvidu-room-burst");
            }
            verify(client, times(1)).createSession("room-burst");
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void removalWaitsForCreationAndDoesNotLeaveLateSessionCached() throws Exception {
        OpenViduClient client = mock(OpenViduClient.class);
        CountDownLatch firstCreationEntered = new CountDownLatch(1);
        CountDownLatch releaseFirstCreation = new CountDownLatch(1);
        AtomicInteger creationCount = new AtomicInteger();
        when(client.createSession("room-close-race")).thenAnswer(invocation -> {
            int attempt = creationCount.incrementAndGet();
            if (attempt == 1) {
                firstCreationEntered.countDown();
                assertThat(releaseFirstCreation.await(2, TimeUnit.SECONDS)).isTrue();
            }
            return session("openvidu-room-close-race-" + attempt);
        });
        OpenViduService service = service(client);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<String> creation = executor.submit(() -> service.ensureSession("room-close-race"));
            assertThat(firstCreationEntered.await(2, TimeUnit.SECONDS)).isTrue();
            Future<?> removal = executor.submit(() -> service.removeSession("room-close-race"));

            releaseFirstCreation.countDown();
            assertThat(creation.get(2, TimeUnit.SECONDS)).isEqualTo("openvidu-room-close-race-1");
            removal.get(2, TimeUnit.SECONDS);

            assertThat(service.ensureSession("room-close-race"))
                    .isEqualTo("openvidu-room-close-race-2");
            verify(client, times(2)).createSession("room-close-race");
            verify(client).deleteSession("openvidu-room-close-race-1");
        } finally {
            executor.shutdownNow();
        }
    }

    private OpenViduService service(OpenViduClient client) {
        OpenViduProperties properties = new OpenViduProperties();
        properties.setUrl("https://openvidu:4443");
        return new OpenViduService(client, properties, mock(WebRtcEventLogger.class));
    }

    private OpenViduSessionResponse session(String sessionId) {
        return new OpenViduSessionResponse(sessionId, "session", 1L);
    }
}
