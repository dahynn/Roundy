package com.ssafya701.roundy.global.infra.ai;

import com.ssafya701.roundy.global.common.CommonResponse;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;

/**
 * AI 서버 클라이언트
 * - 얼굴 검증 요청
 * - AI 서버 주소 확정 후 구현 완료 예정
 */
@Slf4j
@Component
public class AiServerClient {

    private final RestTemplate restTemplate;

    @Value("${ai.server.url}")
    private String aiServerUrl;



    public AiServerClient() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * 얼굴 검증 요청
     *
     * @param realtimeImage 실시간 이미지
     * @param originalImage 원본 이미지 (MinIO)
     * @return 검증 결과 (true: 일치, false: 불일치)
     */
    public boolean verifyFace(MultipartFile realtimeImage, InputStream originalImage) {
        // // TODO: AI 서버 주소 확정 후 구현
        // // 현재는 임시로 예외 발생
        // if (aiServerUrl == null || aiServerUrl.equals("http://localhost:5000")) {
        //     log.warn("AI server URL not configured, skipping verification");
        //     throw new UnsupportedOperationException(
        //             "AI 서버 주소가 확정되지 않았습니다. " +
        //                     "application.properties의 ai.server.url을 설정해주세요."
        //     );
        // }

        try {
            // Multipart 요청 준비
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            


            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("realtimeImage", realtimeImage.getResource());
            body.add("originalImage", new InputStreamResource(originalImage));

            HttpEntity<MultiValueMap<String, Object>> requestEntity =
                    new HttpEntity<>(body, headers);

            // AI 서버 호출
            String url = aiServerUrl + "/verify";
            log.info("Calling AI server: url={}", url);

            ResponseEntity<CommonResponse> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    requestEntity,
                    CommonResponse.class
            );

            boolean verified = response.getBody() != null && response.getBody().isSuccess();
            log.info("AI verification result: verified={}", verified);
            
            return verified;

        } catch (Exception e) {
            log.error("AI server call failed", e);
            throw new RuntimeException("AI 서버 호출 실패: " + e.getMessage(), e);
        }
    }

}
