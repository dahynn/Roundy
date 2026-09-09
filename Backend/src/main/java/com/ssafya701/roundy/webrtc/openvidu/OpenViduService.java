package com.ssafya701.roundy.webrtc.openvidu;

import com.ssafya701.roundy.config.OpenViduProperties;
import com.ssafya701.roundy.webrtc.openvidu.dto.OpenViduSessionResponse;
import com.ssafya701.roundy.webrtc.openvidu.dto.OpenViduTokenResponse;
import com.ssafya701.roundy.webrtc.logging.WebRtcEventLogger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.Map;
import java.util.Set;
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
    private final Map<Long, Set<ConnectionReference>> connectionsByUser = new ConcurrentHashMap<>();

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
        // String customSessionId = "room-" + roomId; // 중복 prefix 방지: 호출자가 이미 고유 ID를
        // 관리함
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

            token = toBrowserTokenUrl(token);
            connectionsByUser.computeIfAbsent(userId, ignored -> ConcurrentHashMap.newKeySet())
                    .add(new ConnectionReference(sessionId, response.getId()));

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
            try {
                openViduClient.deleteSession(sessionId);
                log.info("OpenVidu Session 종료: roomId={}", roomId);
            } catch (OpenViduClient.OpenViduClientException e) {
                // Redis 방 권한은 이미 제거되므로, 실패 원문·토큰 없이 재시도 가능 정보만 남긴다.
                log.warn("OpenVidu Session 종료 요청 실패: roomId={}", roomId);
            } finally {
                connectionsByUser.values().forEach(connections ->
                        connections.removeIf(connection -> connection.sessionId().equals(sessionId)));
            }
        }
    }

    /**
     * 퇴장한 사용자의 발급 연결을 모두 무효화한다.
     */
    public void revokeUserConnections(Long userId) {
        Set<ConnectionReference> connections = connectionsByUser.remove(userId);
        if (connections == null) {
            return;
        }

        for (ConnectionReference connection : connections) {
            try {
                openViduClient.deleteConnection(connection.sessionId(), connection.connectionId());
            } catch (OpenViduClient.OpenViduClientException e) {
                log.warn("OpenVidu 사용자 연결 종료 요청 실패: userId={}", userId);
            }
        }
    }

    /**
     * OpenVidu 서버 URL 반환
     *
     * @return OpenVidu 서버 URL
     */
    public String getOpenViduUrl() {
        String publicUrl = openViduProperties.getPublicUrl();
        return publicUrl == null || publicUrl.isBlank()
                ? openViduProperties.getUrl()
                : publicUrl;
    }

    /**
     * OpenVidu가 내부 호스트명으로 발급한 토큰을 브라우저가 접근 가능한 공개 주소로 바꾼다.
     * 공개 URL에 경로가 있으면(예: /openvidu) 해당 경로를 보존한다.
     */
    String toBrowserTokenUrl(String token) {
        if (token == null || token.isBlank()) {
            return token;
        }

        try {
            URI tokenUri = URI.create(token);
            URI publicUri = URI.create(getOpenViduUrl());
            if (!tokenUri.isAbsolute() || tokenUri.getRawAuthority() == null
                    || publicUri.getScheme() == null || publicUri.getRawAuthority() == null) {
                log.warn("OpenVidu 공개 URL 형식이 올바르지 않아 발급 토큰을 그대로 사용합니다");
                return token;
            }

            String publicPath = normalizePath(publicUri.getRawPath());
            String tokenPath = normalizePath(tokenUri.getRawPath());
            String path = mergePaths(publicPath, tokenPath);
            String scheme = toWebSocketScheme(publicUri.getScheme());

            StringBuilder browserToken = new StringBuilder(scheme)
                    .append("://")
                    .append(publicUri.getRawAuthority())
                    .append(path);
            if (tokenUri.getRawQuery() != null) {
                browserToken.append('?').append(tokenUri.getRawQuery());
            }
            if (tokenUri.getRawFragment() != null) {
                browserToken.append('#').append(tokenUri.getRawFragment());
            }

            return browserToken.toString();
        } catch (IllegalArgumentException exception) {
            log.warn("OpenVidu 토큰 URL 형식이 올바르지 않아 발급 토큰을 그대로 사용합니다", exception);
            return token;
        }
    }

    private String normalizePath(String path) {
        if (path == null || path.isBlank() || "/".equals(path)) {
            return "";
        }
        return path.endsWith("/") ? path.substring(0, path.length() - 1) : path;
    }

    private String mergePaths(String publicPath, String tokenPath) {
        if (publicPath.isEmpty() || tokenPath.startsWith(publicPath)) {
            return tokenPath;
        }
        if (tokenPath.isEmpty()) {
            return publicPath;
        }
        return publicPath + (tokenPath.startsWith("/") ? tokenPath : "/" + tokenPath);
    }

    private String toWebSocketScheme(String scheme) {
        return switch (scheme) {
            case "https", "wss" -> "wss";
            case "http", "ws" -> "ws";
            default -> scheme;
        };
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

    private record ConnectionReference(String sessionId, String connectionId) {
    }
}
