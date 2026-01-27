package com.ssafya701.roundy.webrtc.openvidu;

import com.ssafya701.roundy.webrtc.openvidu.dto.OpenViduSessionResponse;
import com.ssafya701.roundy.webrtc.openvidu.dto.OpenViduTokenResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.Map;

/**
 * OpenVidu REST API 호출 클라이언트
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpenViduClient {

    private final WebClient openViduWebClient;

    /**
     * OpenVidu Session 생성 또는 기존 Session 정보 조회
     * 
     * @param customSessionId 커스텀 Session ID
     * @return OpenVidu Session 응답
     * @throws OpenViduClientException OpenVidu API 호출 실패 시
     */
    public OpenViduSessionResponse createSession(String customSessionId) {
        log.debug("OpenVidu Session 생성 요청: customSessionId={}", customSessionId);

        try {
            OpenViduSessionResponse response = openViduWebClient.post()
                .uri("/openvidu/api/sessions")
                .bodyValue(Map.of("customSessionId", customSessionId))
                .retrieve()
                .bodyToMono(OpenViduSessionResponse.class)
                .onErrorResume(WebClientResponseException.Conflict.class, e -> {
                    // 409 Conflict: 이미 존재하는 세션, body에서 Session 정보 파싱
                    log.info("기존 Session 사용: customSessionId={}", customSessionId);
                    try {
                        OpenViduSessionResponse existingSession = new com.fasterxml.jackson.databind.ObjectMapper()
                            .readValue(e.getResponseBodyAsString(), OpenViduSessionResponse.class);
                        return Mono.just(existingSession);
                    } catch (Exception parseException) {
                        log.warn("409 응답 파싱 실패, customSessionId로 Session 반환: {}", customSessionId);
                        return Mono.just(new OpenViduSessionResponse(customSessionId, "session", System.currentTimeMillis()));
                    }
                })
                .retryWhen(Retry.backoff(3, Duration.ofSeconds(1))
                    .filter(throwable -> !(throwable instanceof WebClientResponseException.Unauthorized))
                    .filter(throwable -> !(throwable instanceof WebClientResponseException.Conflict))
                    .doBeforeRetry(signal -> log.warn("OpenVidu Session 생성 재시도: attempt={}", signal.totalRetries() + 1))
                )
                .timeout(Duration.ofSeconds(10))
                .block();

            log.info("OpenVidu Session 생성 성공: sessionId={}", response.getId());
            return response;

        } catch (WebClientResponseException.Unauthorized e) {
            log.error("OpenVidu 인증 실패: secret이 올바르지 않습니다");
            throw new OpenViduClientException("OpenVidu 인증 실패", e);
        } catch (WebClientResponseException e) {
            log.error("OpenVidu Session 생성 실패: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new OpenViduClientException("OpenVidu Session 생성 실패: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("OpenVidu Session 생성 중 오류 발생", e);
            throw new OpenViduClientException("OpenVidu Session 생성 중 오류 발생", e);
        }
    }

    /**
     * OpenVidu Connection Token 발급
     * 
     * @param sessionId Session ID
     * @return OpenVidu Token 응답
     * @throws OpenViduClientException OpenVidu API 호출 실패 시
     */
    public OpenViduTokenResponse createToken(String sessionId) {
        log.debug("OpenVidu Token 발급 요청: sessionId={}", sessionId);

        try {
            OpenViduTokenResponse response = openViduWebClient.post()
                .uri("/openvidu/api/sessions/{sessionId}/connection", sessionId)
                .bodyValue(Map.of("type", "WEBRTC"))
                .retrieve()
                .onStatus(
                    HttpStatus.NOT_FOUND::equals,
                    clientResponse -> Mono.error(new OpenViduClientException("Session을 찾을 수 없습니다: " + sessionId))
                )
                .bodyToMono(OpenViduTokenResponse.class)
                .retryWhen(Retry.backoff(3, Duration.ofSeconds(1))
                    .filter(throwable -> !(throwable instanceof WebClientResponseException.Unauthorized))
                    .filter(throwable -> !(throwable instanceof WebClientResponseException.NotFound))
                    .doBeforeRetry(signal -> log.warn("OpenVidu Token 발급 재시도: attempt={}", signal.totalRetries() + 1))
                )
                .timeout(Duration.ofSeconds(10))
                .block();

            log.info("OpenVidu Token 발급 성공: sessionId={}, connectionId={}", sessionId, response.getId());
            return response;

        } catch (WebClientResponseException.Unauthorized e) {
            log.error("OpenVidu 인증 실패: secret이 올바르지 않습니다");
            throw new OpenViduClientException("OpenVidu 인증 실패", e);
        } catch (WebClientResponseException.NotFound e) {
            log.error("OpenVidu Session을 찾을 수 없음: sessionId={}", sessionId);
            throw new OpenViduClientException("Session을 찾을 수 없습니다: " + sessionId, e);
        } catch (WebClientResponseException e) {
            log.error("OpenVidu Token 발급 실패: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new OpenViduClientException("OpenVidu Token 발급 실패: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("OpenVidu Token 발급 중 오류 발생", e);
            throw new OpenViduClientException("OpenVidu Token 발급 중 오류 발생", e);
        }
    }

    /**
     * OpenVidu 클라이언트 예외
     */
    public static class OpenViduClientException extends RuntimeException {
        public OpenViduClientException(String message) {
            super(message);
        }

        public OpenViduClientException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
