package com.ssafya701.roundy.webrtc.message;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.ssafya701.roundy.webrtc.message.inbound.JoinRoomMessage;
import com.ssafya701.roundy.webrtc.message.inbound.LeaveRoomMessage;
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
    @JsonSubTypes.Type(value = SubmitGameVoteMessage.class, name = "SUBMIT_GAME_VOTE"),
    @JsonSubTypes.Type(value = JoinOkMessage.class, name = "JOIN_OK"),
    @JsonSubTypes.Type(value = RoomStateMessage.class, name = "ROOM_STATE"),
    @JsonSubTypes.Type(value = RoundStartMessage.class, name = "ROUND_START"),
    @JsonSubTypes.Type(value = RoundEndMessage.class, name = "ROUND_END"),
    @JsonSubTypes.Type(value = PairAssignedMessage.class, name = "PAIR_ASSIGNED"),
    @JsonSubTypes.Type(value = ErrorMessage.class, name = "ERROR"),
    @JsonSubTypes.Type(value = KickMessage.class, name = "KICK")
})
public interface WsMessage {
    WsMessageType getType();
}
