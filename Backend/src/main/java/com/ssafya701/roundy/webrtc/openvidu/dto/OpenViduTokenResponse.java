package com.ssafya701.roundy.webrtc.openvidu.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * OpenVidu Connection Token 생성 API 응답
 * POST /openvidu/api/sessions/{sessionId}/connection
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class OpenViduTokenResponse {
    
    /**
     * Connection ID
     */
    private String id;
    
    /**
     * Object type (항상 "connection")
     */
    private String object;
    
    /**
     * 클라이언트가 사용할 접속 토큰
     */
    private String token;
    
    /**
     * Connection 생성 시간 (타임스탬프)
     */
    private Long createdAt;
}
