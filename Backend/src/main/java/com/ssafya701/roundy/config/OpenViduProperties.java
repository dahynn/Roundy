package com.ssafya701.roundy.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

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
}
