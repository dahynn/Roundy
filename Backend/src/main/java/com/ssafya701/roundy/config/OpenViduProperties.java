package com.ssafya701.roundy.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * OpenVidu 서버 연결 설정
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "openvidu")
public class OpenViduProperties {
    
    /**
     * OpenVidu 서버 URL
     * 예: https://openvidu.example.com
     */
    private String url;

    /**
     * 브라우저가 접속할 수 있는 공개 URL.
     * 미설정 시 단일 호스트 환경을 위해 url을 그대로 사용한다.
     */
    private String publicUrl;
    
    /**
     * OpenVidu 서버 시크릿 키
     */
    private String secret;

    /**
     * 로컬 self-signed 인증서에서만 명시적으로 활성화한다.
     * 운영 기본값은 인증서 검증 활성화(false)다.
     */
    private boolean insecureTls = false;

    /**
     * 연속 통신 실패가 이 횟수에 도달하면 외부 호출을 잠시 차단한다.
     */
    private int circuitFailureThreshold = 3;

    /**
     * 회로 차단 후 복구 확인 요청을 허용하기까지의 대기 시간.
     */
    private Duration circuitOpenDuration = Duration.ofSeconds(30);
}
