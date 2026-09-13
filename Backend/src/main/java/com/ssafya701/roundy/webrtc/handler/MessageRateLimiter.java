package com.ssafya701.roundy.webrtc.handler;

interface MessageRateLimiter {

    boolean allow(String actorKey);
}
