package com.ssafya701.roundy.webrtc.openvidu;

import com.ssafya701.roundy.config.OpenViduProperties;
import com.ssafya701.roundy.webrtc.logging.WebRtcEventLogger;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OpenViduServiceCircuitBreakerTest {

    @Test
    void repeatedSessionFailuresAreConvertedToFailFastServiceErrors() {
        OpenViduClient client = mock(OpenViduClient.class);
        when(client.createSession(anyString()))
                .thenThrow(new OpenViduClient.OpenViduClientException("unavailable"));

        OpenViduProperties properties = new OpenViduProperties();
        properties.setUrl("https://openvidu:4443");
        OpenViduCircuitBreaker circuitBreaker = new OpenViduCircuitBreaker(
                2, Duration.ofSeconds(30), new AtomicLong()::get);
        OpenViduService service = new OpenViduService(
                client,
                properties,
                mock(WebRtcEventLogger.class),
                circuitBreaker
        );

        assertThatThrownBy(() -> service.ensureSession("room-1"))
                .isInstanceOf(OpenViduService.OpenViduServiceException.class);
        assertThatThrownBy(() -> service.ensureSession("room-2"))
                .isInstanceOf(OpenViduService.OpenViduServiceException.class);
        assertThatThrownBy(() -> service.ensureSession("room-3"))
                .isInstanceOf(OpenViduService.OpenViduServiceException.class)
                .hasCauseInstanceOf(OpenViduCircuitBreaker.CircuitOpenException.class);

        verify(client, times(2)).createSession(anyString());
    }
}
