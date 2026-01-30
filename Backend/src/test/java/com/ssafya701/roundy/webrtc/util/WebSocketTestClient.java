package com.ssafya701.roundy.webrtc.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafya701.roundy.webrtc.message.WsMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * 테스트용 WebSocket 클라이언트
 */
@Slf4j
public class WebSocketTestClient extends TextWebSocketHandler {

    private final ObjectMapper objectMapper;
    private final StandardWebSocketClient client;
    private WebSocketSession session;
    private final List<String> receivedMessages;
    private final CompletableFuture<Void> connectionFuture;

    public WebSocketTestClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.client = new StandardWebSocketClient();
        this.receivedMessages = new ArrayList<>();
        this.connectionFuture = new CompletableFuture<>();
    }

    /**
     * WebSocket 서버에 연결
     * 
     * @param url WebSocket URL
     * @param token JWT 토큰
     * @return 연결된 세션
     * @throws Exception 연결 실패 시
     */
    public WebSocketSession connect(String url, String token) throws Exception {
        String wsUrl = url + "?token=" + token;
        log.info("WebSocket 연결 시도: url={}", wsUrl);
        
        session = client.execute(this, null, URI.create(wsUrl)).get(5, TimeUnit.SECONDS);
        connectionFuture.get(5, TimeUnit.SECONDS);
        
        log.info("WebSocket 연결 성공: sessionId={}", session.getId());
        return session;
    }

    /**
     * 메시지 전송
     * 
     * @param message 전송할 메시지 객체
     * @throws IOException 전송 실패 시
     */
    public void sendMessage(WsMessage message) throws IOException {
        if (session == null || !session.isOpen()) {
            throw new IllegalStateException("WebSocket 세션이 연결되지 않았습니다");
        }

        String json = objectMapper.writeValueAsString(message);
        session.sendMessage(new TextMessage(json));
        log.debug("메시지 전송: type={}, json={}", message.getType(), json);
    }

    /**
     * JSON 문자열로 메시지 전송
     * 
     * @param json JSON 문자열
     * @throws IOException 전송 실패 시
     */
    public void sendRawMessage(String json) throws IOException {
        if (session == null || !session.isOpen()) {
            throw new IllegalStateException("WebSocket 세션이 연결되지 않았습니다");
        }

        session.sendMessage(new TextMessage(json));
        log.debug("Raw 메시지 전송: json={}", json);
    }

    /**
     * 연결 종료
     * 
     * @throws IOException 종료 실패 시
     */
    public void disconnect() throws IOException {
        if (session != null && session.isOpen()) {
            session.close();
            log.info("WebSocket 연결 종료");
        }
    }

    /**
     * 수신한 메시지 목록 반환
     * 
     * @return 수신한 메시지 목록
     */
    public List<String> getReceivedMessages() {
        return new ArrayList<>(receivedMessages);
    }

    /**
     * 수신한 메시지를 특정 타입으로 파싱
     * 
     * @param messageClass 메시지 타입 클래스
     * @param <T> 메시지 타입
     * @return 파싱된 메시지 목록
     */
    public <T extends WsMessage> List<T> getReceivedMessages(Class<T> messageClass) {
        List<T> messages = new ArrayList<>();
        for (String json : receivedMessages) {
            try {
                T message = objectMapper.readValue(json, messageClass);
                messages.add(message);
            } catch (Exception e) {
                log.warn("메시지 파싱 실패: json={}", json, e);
            }
        }
        return messages;
    }

    /**
     * 마지막 수신 메시지 반환
     * 
     * @return 마지막 메시지 (없으면 null)
     */
    public String getLastMessage() {
        return receivedMessages.isEmpty() ? null : receivedMessages.get(receivedMessages.size() - 1);
    }

    /**
     * 특정 타입의 메시지 대기 (타임아웃 포함)
     * 
     * @param messageClass 대기할 메시지 타입
     * @param timeoutMs 타임아웃 (밀리초)
     * @param <T> 메시지 타입
     * @return 수신된 메시지
     * @throws Exception 타임아웃 또는 오류 발생 시
     */
    public <T extends WsMessage> T waitForMessage(Class<T> messageClass, long timeoutMs) throws Exception {
        long startTime = System.currentTimeMillis();
        
        while (System.currentTimeMillis() - startTime < timeoutMs) {
            for (String json : receivedMessages) {
                try {
                    WsMessage message = objectMapper.readValue(json, WsMessage.class);
                    if (messageClass.isInstance(message)) {
                        return messageClass.cast(message);
                    }
                } catch (Exception e) {
                    log.warn("메시지 파싱 실패: json={}", json, e);
                }
            }
            Thread.sleep(100);
        }
        
        throw new Exception("메시지 수신 타임아웃: " + messageClass.getSimpleName());
    }

    /**
     * 수신한 메시지 초기화
     */
    public void clearReceivedMessages() {
        receivedMessages.clear();
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        log.info("WebSocket 연결 성공: sessionId={}", session.getId());
        connectionFuture.complete(null);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        log.debug("메시지 수신: payload={}", payload);
        receivedMessages.add(payload);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.error("WebSocket 전송 오류", exception);
        connectionFuture.completeExceptionally(exception);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) throws Exception {
        log.info("WebSocket 연결 종료: status={}", status);
    }
}
