package com.ssafya701.roundy.webrtc.message.outbound;

import com.ssafya701.roundy.webrtc.message.WsMessage;
import com.ssafya701.roundy.webrtc.message.WsMessageType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class FirstVoteResultMessage implements WsMessage {
    private List<VoteDetail> results;

    @Override
    public WsMessageType getType() {
        return WsMessageType.FIRST_VOTE_RESULT; // Need to add ANY enum or just use String if enum is strict
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VoteDetail {
        private Long voterId;
        private String voterNickname;
        private Long targetId;
        private String targetNickname;
    }
}
