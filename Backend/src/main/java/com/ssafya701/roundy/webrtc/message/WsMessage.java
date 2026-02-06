package com.ssafya701.roundy.webrtc.message;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.ssafya701.roundy.webrtc.message.inbound.JoinRoomMessage;
import com.ssafya701.roundy.webrtc.message.inbound.LeaveRoomMessage;
import com.ssafya701.roundy.webrtc.message.inbound.RenderCompleteMessage;
import com.ssafya701.roundy.webrtc.message.inbound.SubmitGameVoteMessage;
import com.ssafya701.roundy.webrtc.message.inbound.SubmitVoteMessage;
import com.ssafya701.roundy.webrtc.message.outbound.*;

/**
 * WebSocket 메시지 베이스 인터페이스
 * Jackson Polymorphic Deserialization을 위한 설정
 */
@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.PROPERTY,
    property = "type"
)
@JsonSubTypes({
    @JsonSubTypes.Type(value = JoinRoomMessage.class, name = "JOIN_ROOM"),
    @JsonSubTypes.Type(value = LeaveRoomMessage.class, name = "LEAVE_ROOM"),
    @JsonSubTypes.Type(value = SubmitVoteMessage.class, name = "SUBMIT_VOTE"),
    @JsonSubTypes.Type(value = SubmitGameVoteMessage.class, name = "SUBMIT_GAME_ANSWER"),
    @JsonSubTypes.Type(value = JoinOkMessage.class, name = "JOIN_OK"),
    @JsonSubTypes.Type(value = RoomStateMessage.class, name = "ROOM_STATE"),
    @JsonSubTypes.Type(value = RoundStartMessage.class, name = "ROUND_START"),
    @JsonSubTypes.Type(value = RoundEndMessage.class, name = "ROUND_END"),
    @JsonSubTypes.Type(value = PairAssignedMessage.class, name = "PAIR_ASSIGNED"),
    @JsonSubTypes.Type(value = ErrorMessage.class, name = "ERROR"),
    @JsonSubTypes.Type(value = KickMessage.class, name = "KICK"),
    // 신규 추가 메시지들 등록
    @JsonSubTypes.Type(value = StageChangeMessage.class, name = "STAGE_CHANGE"),
    @JsonSubTypes.Type(value = SpeakerChangeMessage.class, name = "SPEAKER_CHANGE"),
    @JsonSubTypes.Type(value = GameQuestionMessage.class, name = "GAME_QUESTION"),
    @JsonSubTypes.Type(value = GameResultMessage.class, name = "GAME_RESULT"),
    @JsonSubTypes.Type(value = MatchResultMessage.class, name = "MATCH_RESULT"),
    @JsonSubTypes.Type(value = FaceRevealStartMessage.class, name = "FACE_REVEAL_START"),
    @JsonSubTypes.Type(value = VoteSubmittedMessage.class, name = "VOTE_SUBMITTED"),
    @JsonSubTypes.Type(value = FirstVoteResultMessage.class, name = "FIRST_VOTE_RESULT"),
    @JsonSubTypes.Type(value = BreakMessage.class, name = "BREAK"),
    @JsonSubTypes.Type(value = PartnerLeftMessage.class, name = "PARTNER_LEFT"),
    @JsonSubTypes.Type(value = RenderCompleteMessage.class, name = "RENDER_COMPLETE"),
    @JsonSubTypes.Type(value = StartTimerMessage.class, name = "START_TIMER"),
    @JsonSubTypes.Type(value = PartnerReconnectedMessage.class, name = "PARTNER_RECONNECTED")
})
public interface WsMessage {
    @com.fasterxml.jackson.annotation.JsonIgnore
    WsMessageType getType();
}
