package com.ssafya701.roundy.webrtc.openvidu;

import com.ssafya701.roundy.config.OpenViduProperties;
import com.ssafya701.roundy.webrtc.openvidu.dto.OpenViduSessionResponse;
import com.ssafya701.roundy.webrtc.openvidu.dto.OpenViduTokenResponse;
import com.ssafya701.roundy.webrtc.logging.WebRtcEventLogger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * OpenVidu Session 및 Token 관리 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OpenViduService {

    private final OpenViduClient openViduClient;
    private final OpenViduProperties openViduProperties;
    private final WebRtcEventLogger eventLogger;

    /**
     * 방 ID별 OpenVidu Session ID 캐시F
     * Key: roomId, Value: openViduSessionId
     */
    private final Map<String, String> sessionCache = new ConcurrentHashMap<>();

    /**
     * 방에 대한 OpenVidu Session을 보장하고 Session ID 반환
     * Session이 없으면 생성하고, 있으면 기존 Session ID 반환
     *
     * @param roomId 방 ID
     * @return OpenVidu Session ID
     */
    public String ensureSession(String roomId) {
        log.debug("OpenVidu Session 보장 요청: roomId={}", roomId);

        // 캐시 확인
        String cachedSessionId = sessionCache.get(roomId);
        if (cachedSessionId != null) {
            log.debug("캐시된 Session 사용: roomId={}, sessionId={}", roomId, cachedSessionId);
            return cachedSessionId;
        }

        // Session 생성
        // String customSessionId = "room-" + roomId; // 중복 prefix 방지: 호출자가 이미 고유 ID를 관리함
        String customSessionId = roomId;
        try {
            OpenViduSessionResponse response = openViduClient.createSession(customSessionId);
            String sessionId = response.getId();

            // 캐시 저장
            sessionCache.put(roomId, sessionId);

            log.debug("OpenVidu Session 보장 완료: roomId={}, sessionId={}", roomId, sessionId);
            eventLogger.logOpenViduSessionCreated(roomId, sessionId);

            return sessionId;

        } catch (OpenViduClient.OpenViduClientException e) {
            log.error("OpenVidu Session 생성 실패: roomId={}", roomId, e);
            throw new OpenViduServiceException("OpenVidu Session 생성 실패: " + roomId, e);
        }
    }

    /**
     * 참가자를 위한 OpenVidu Connection Token 발급
     *
     * @param roomId 방 ID
     * @param userId 사용자 ID
     * @return OpenVidu Connection Token
     */
    public String generateToken(String roomId, Long userId) {
        log.debug("OpenVidu Token 발급 요청: roomId={}, userId={}", roomId, userId);

        // Session ID 확인
        String sessionId = sessionCache.get(roomId);
        if (sessionId == null) {
            log.error("Session이 존재하지 않음: roomId={}", roomId);
            throw new OpenViduServiceException("Session이 존재하지 않습니다: " + roomId);
        }

        try {
            OpenViduTokenResponse response = openViduClient.createToken(sessionId);
            String token = response.getToken();

            // [FIX] Mixed Content 방지: HTTPS 환경에서는 ws:// 연결이 차단되므로 wss://로 강제 변환
            if (token != null && token.startsWith("ws://")) {
                token = token.replace("ws://", "wss://"); 
                log.info("OpenVidu 토큰 URL 보안 변환 완료: ws:// -> wss://");
            }

            log.debug("OpenVidu Token 발급 완료: roomId={}, userId={}, connectionId={}",
                roomId, userId, response.getId());
            eventLogger.logOpenViduTokenGenerated(roomId, userId, response.getId());

            return token;

        } catch (OpenViduClient.OpenViduClientException e) {
            log.error("OpenVidu Token 발급 실패: roomId={}, userId={}", roomId, userId, e);
            throw new OpenViduServiceException("OpenVidu Token 발급 실패: " + roomId, e);
        }
    }

    /**
     * 방의 OpenVidu Session 제거 (방 종료 시)
     *
     * @param roomId 방 ID
     */
    public void removeSession(String roomId) {
        log.debug("OpenVidu Session 제거: roomId={}", roomId);

        String sessionId = sessionCache.remove(roomId);
        if (sessionId != null) {
            log.debug("OpenVidu Session 캐시 제거 완료: roomId={}, sessionId={}", roomId, sessionId);
            // TODO: 실제로 OpenVidu Server에서 Session을 삭제하려면 DELETE API 호출 필요
            // 현재는 캐시만 제거하고, OpenVidu는 자동으로 빈 Session을 정리함
        }
    }

    /**
     * OpenVidu 서버 URL 반환
     *
     * @return OpenVidu 서버 URL
     */
    public String getOpenViduUrl() {
        return openViduProperties.getUrl();
    }

    /**
     * 모든 Session 캐시 제거 (테스트용)
     */
    public void clearSessionCache() {
        log.warn("모든 OpenVidu Session 캐시 제거");
        sessionCache.clear();
    }

    /**
     * OpenVidu 서비스 예외
     */
    public static class OpenViduServiceException extends RuntimeException {
        public OpenViduServiceException(String message) {
            super(message);
        }

        public OpenViduServiceException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
