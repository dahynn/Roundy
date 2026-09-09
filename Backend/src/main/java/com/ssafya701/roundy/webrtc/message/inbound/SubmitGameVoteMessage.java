package com.ssafya701.roundy.webrtc.message.inbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 게임 투표 제출 메시지 (클라이언트 → 서버)
 * 이미지 게임(IMAGE_GAME) 단계에서 사용
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class SubmitGameVoteMessage implements WsMessage {
    
    // 클라이언트가 보내는 JSON String (중첩 JSON)
    // 예: "{\"questionIndex\":0,\"targetUserId\":202}"
    private String answer;
    
    // 내부적으로 사용하는 필드 (JSON 파싱 후 설정됨)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private int questionNumber;
    
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Long targetUserId;
    
    /**
     * answer 필드가 설정될 때 내부 JSON 파싱 수행
     */
    public void setAnswer(String answer) {
        this.answer = answer;
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode node = mapper.readTree(answer);
            
            // 클라이언트: questionIndex (0-based) -> 서버: questionNumber (1-based 변환 필요 여부 확인)
            // 보통 Log에서 보면 questionNumber가 1,2,3.. 이므로 +1 해야 할 수도 있음.
            // 클라이언트 예시: questionIndex:0 -> 문제 1번
            if (node.has("questionIndex")) {
                this.questionNumber = node.get("questionIndex").asInt() + 1;
            }
            if (node.has("targetUserId")) {
                this.targetUserId = node.get("targetUserId").asLong();
            }
        } catch (Exception ignored) {
            // 파싱 실패는 handler가 안전한 입력 오류로 처리한다. 원문을 로그에 남기지 않는다.
        }
    }
    
    @Override
    public WsMessageType getType() {
        // 타입명은 WsMessage에서 SUBMIT_GAME_ANSWER로 매핑됨
        return WsMessageType.SUBMIT_GAME_VOTE;
    }
}
