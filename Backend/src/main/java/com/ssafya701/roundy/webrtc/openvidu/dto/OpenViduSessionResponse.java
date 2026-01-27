package com.ssafya701.roundy.webrtc.openvidu.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * OpenVidu Session 생성 API 응답
 * POST /openvidu/api/sessions
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class OpenViduSessionResponse {
    
    /**
     * Session ID
     */
    private String id;
    
    /**
     * Object type (항상 "session")
     */
    private String object;
    
    /**
     * Session 생성 시간 (타임스탬프)
     */
    private Long createdAt;
}
