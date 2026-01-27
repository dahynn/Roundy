package com.ssafya701.roundy.webrtc.serializer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafya701.roundy.webrtc.message.WsMessage;
import org.springframework.stereotype.Component;

/**
 * WebSocket 메시지 직렬화/역직렬화 유틸리티
 */
@Component
public class WsMessageSerializer {
    
    private final ObjectMapper objectMapper;
    
    public WsMessageSerializer(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }
    
    /**
     * WsMessage 객체를 JSON 문자열로 직렬화
     * @param message 직렬화할 메시지
     * @return JSON 문자열
     * @throws JsonProcessingException 직렬화 실패 시
     */
    public String serialize(WsMessage message) throws JsonProcessingException {
        return objectMapper.writeValueAsString(message);
    }
    
    /**
     * JSON 문자열을 WsMessage 객체로 역직렬화
     * @param json JSON 문자열
     * @return WsMessage 객체
     * @throws JsonProcessingException 역직렬화 실패 시
     */
    public WsMessage deserialize(String json) throws JsonProcessingException {
        return objectMapper.readValue(json, WsMessage.class);
    }
    
    /**
     * JSON 문자열을 특정 타입의 WsMessage로 역직렬화
     * @param json JSON 문자열
     * @param clazz 대상 클래스
     * @param <T> WsMessage 구현 타입
     * @return 역직렬화된 메시지
     * @throws JsonProcessingException 역직렬화 실패 시
     */
    public <T extends WsMessage> T deserialize(String json, Class<T> clazz) throws JsonProcessingException {
        return objectMapper.readValue(json, clazz);
    }
}
