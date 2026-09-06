package com.ssafya701.roundy.webrtc.openvidu;

import com.ssafya701.roundy.config.OpenViduProperties;
import com.ssafya701.roundy.webrtc.logging.WebRtcEventLogger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class OpenViduServiceTest {

    private OpenViduProperties properties;
    private OpenViduService service;

    @BeforeEach
    void setUp() {
        properties = new OpenViduProperties();
        properties.setUrl("https://openvidu:4443");
        service = new OpenViduService(
                mock(OpenViduClient.class),
                properties,
                mock(WebRtcEventLogger.class));
    }

    @Test
    void returnsInternalUrlWhenPublicUrlIsMissing() {
        assertThat(service.getOpenViduUrl()).isEqualTo("https://openvidu:4443");
    }

    @Test
    void returnsPublicUrlForBrowserConnections() {
        properties.setPublicUrl("https://video.example.com");

        assertThat(service.getOpenViduUrl()).isEqualTo("https://video.example.com");
    }

    @Test
    void convertsInternalTokenHostToConfiguredPublicHost() {
        properties.setPublicUrl("https://video.example.com");

        assertThat(service.toBrowserTokenUrl("ws://openvidu:4443?sessionId=room-1&token=abc"))
                .isEqualTo("wss://video.example.com?sessionId=room-1&token=abc");
    }

    @Test
    void keepsConfiguredPublicPathWhenProxyUsesOne() {
        properties.setPublicUrl("https://roundy.example.com/openvidu");

        assertThat(service.toBrowserTokenUrl("ws://openvidu:4443?sessionId=room-1"))
                .isEqualTo("wss://roundy.example.com/openvidu?sessionId=room-1");
    }

    @Test
    void keepsMalformedTokenUnchanged() {
        assertThat(service.toBrowserTokenUrl("not a URL"))
                .isEqualTo("not a URL");
    }

    @Test
    void keepsNonUrlTokenUnchanged() {
        assertThat(service.toBrowserTokenUrl("test-token-123"))
                .isEqualTo("test-token-123");
    }
}
