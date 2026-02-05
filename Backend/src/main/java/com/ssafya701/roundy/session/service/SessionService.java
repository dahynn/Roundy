package com.ssafya701.roundy.session.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafya701.roundy.session.dto.RoomMatchResult;
import com.ssafya701.roundy.session.dto.response.RoomMemberInfo;
import com.ssafya701.roundy.session.dto.response.RoomMembersResponse;
import com.ssafya701.roundy.session.dto.response.SessionStatusResponse;
import com.ssafya701.roundy.auth.enums.GenderType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.scripting.support.ResourceScriptSource;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;

// Twin Cursor 매칭 로직 (SortedSet FIFO, Lua Script)
@Slf4j
@Service
@RequiredArgsConstructor
public class SessionService {

    private final RedisTemplate<String, String> redisTemplate;
    // [추가] 직렬화 문제 해결을 위한 StringRedisTemplate
    private final org.springframework.data.redis.core.StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    private static final String SESSION_QUEUE_MALE = "session:male";
    private static final String SESSION_QUEUE_FEMALE = "session:female";
    private static final String ROOM_ID_KEY = "room:id";
    private static final int REQUIRED_COUNT_PER_GENDER = 3;

    private DefaultRedisScript<List> matchRoomScript;

    @PostConstruct
    public void init() {
        matchRoomScript = new DefaultRedisScript<>();
        matchRoomScript.setScriptSource(
                new ResourceScriptSource(new ClassPathResource("lua/match-room.lua")));
        matchRoomScript.setResultType(List.class);
    }

    // 큐에 추가 + 자동 매칭 (선착순 FIFO)
    public RoomMatchResult addToQueueAndMatch(Long userId, GenderType gender) {
        String queueKey = getQueueKey(gender);
        long timestamp = System.currentTimeMillis();

        // ZADD NX: 이미 있으면 추가 안 함 (중복 방지)
        Boolean added = redisTemplate.opsForZSet().addIfAbsent(queueKey, Objects.requireNonNull(userId.toString()),
                timestamp);

        if (Boolean.FALSE.equals(added)) {
            log.warn("User already in queue: userId={}, gender={}", userId, gender);
        } else {
            log.info("User added to queue: userId={}, gender={}, timestamp={}", userId, gender, timestamp);
        }

        // 매칭 시도 (이미 있든 새로 추가든 매칭은 시도)
        return tryMatchRoom();
    }

    // Lua Script로 원자적 매칭 수행 (남3녀3)
    private RoomMatchResult tryMatchRoom() {
        try {
            // 이번 매칭에 사용할 후보 Room ID 생성 (UUID)
            String candidateRoomId = java.util.UUID.randomUUID().toString();

            List<Object> result = redisTemplate.execute(
                    matchRoomScript,
                    Arrays.asList(SESSION_QUEUE_MALE, SESSION_QUEUE_FEMALE), // KEYS (2개)
                    candidateRoomId // ARGV[1]
            );

            if (result == null || result.isEmpty()) {
                log.error("Lua script returned null or empty result");
                return RoomMatchResult.waiting(0, 0);
            }

            String status = (String) result.get(0);

            if ("WAITING".equals(status)) {
                int maleCount = ((Number) result.get(1)).intValue();
                int femaleCount = ((Number) result.get(2)).intValue();
                log.info("Matching waiting: male={}, female={}", maleCount, femaleCount);
                return RoomMatchResult.waiting(maleCount, femaleCount);
            } else if ("MATCHED".equals(status)) {
                // 매칭 성공 시 Lua가 반환한 roomId 사용 (우리가 보낸 candidateRoomId와 같음)
                String roomId = (String) result.get(1);

                List<String> males = objectMapper.readValue(
                        (String) result.get(2),
                        new TypeReference<List<String>>() {
                        });
                List<String> females = objectMapper.readValue(
                        (String) result.get(3),
                        new TypeReference<List<String>>() {
                        });

                log.info("Room matched! roomId={}, males={}, females={}",
                        roomId, males, females);

                return RoomMatchResult.matched(roomId, males, females);
            }

            return RoomMatchResult.waiting(0, 0);

        } catch (Exception e) {
            log.error("Error executing Lua script for room matching", e);
            return RoomMatchResult.waiting(0, 0);
        }
    }

    // 방 멤버 정보 조회
    public RoomMemberInfo getRoomMemberInfo(Long userId, String roomId) {
        String memberInfoKey = "room:" + roomId + ":member:" + userId;
        Map<Object, Object> memberInfo = stringRedisTemplate.opsForHash().entries(memberInfoKey);

        if (memberInfo.isEmpty()) {
            log.warn("Member info not found: userId={}, roomId={}", userId, roomId);
            return null;
        }

        String gender = (String) memberInfo.get("gender");

        log.info("Member info retrieved: userId={}, roomId={}, gender={}",
                userId, roomId, gender);

        return new RoomMemberInfo(roomId, gender);
    }

    // 방 전체 멤버 정보 조회 (화상 UI용)
    public RoomMembersResponse getRoomMembers(String roomId) {
        List<RoomMembersResponse.MemberDetail> males = new ArrayList<>();
        List<RoomMembersResponse.MemberDetail> females = new ArrayList<>();

        // room:{roomId}:members에서 전체 멤버 리스트 조회
        String roomMembersKey = "room:" + Objects.requireNonNull(roomId) + ":members";
        var allMembers = redisTemplate.opsForSet().members(roomMembersKey);

        if (allMembers == null || allMembers.isEmpty()) {
            log.warn("Room members not found: roomId={}", roomId);
            return new RoomMembersResponse(roomId, males, females);
        }

        // 각 멤버의 정보 조회
        for (String userId : Objects.requireNonNull(allMembers)) {
            String memberInfoKey = "room:" + roomId + ":member:" + Objects.requireNonNull(userId);
            Map<Object, Object> memberInfo = redisTemplate.opsForHash().entries(memberInfoKey);

            if (!memberInfo.isEmpty()) {
                String gender = (String) memberInfo.get("gender");

                RoomMembersResponse.MemberDetail detail = new RoomMembersResponse.MemberDetail(userId);

                if ("MALE".equals(gender)) {
                    males.add(detail);
                } else {
                    females.add(detail);
                }
            }
        }

        log.info("Room members retrieved: roomId={}, maleCount={}, femaleCount={}",
                roomId, males.size(), females.size());

        return new RoomMembersResponse(roomId, males, females);
    }

    // 큐에서 제거 (퇴장)
    public boolean removeFromQueue(Long userId, GenderType gender) {
        String queueKey = getQueueKey(gender);
        Long removed = redisTemplate.opsForZSet().remove(queueKey, Objects.requireNonNull(userId.toString()));

        if (removed != null && removed > 0) {
            log.info("User removed from queue: userId={}, gender={}", userId, gender);
            return true;
        } else {
            log.warn("User not found in queue: userId={}", userId, gender);
            return false;
        }
    }

    // 대기실 현황 조회 (유저 성별 기준 참여 가능한 자리 계산)
    public SessionStatusResponse getSessionStatus(GenderType userGender) {
        Long maleCount = redisTemplate.opsForZSet().zCard(Objects.requireNonNull(SESSION_QUEUE_MALE));
        Long femaleCount = redisTemplate.opsForZSet().zCard(Objects.requireNonNull(SESSION_QUEUE_FEMALE));

        int male = maleCount != null ? maleCount.intValue() : 0;
        int female = femaleCount != null ? femaleCount.intValue() : 0;

        int availableSlots = userGender == GenderType.MALE
                ? Math.max(0, REQUIRED_COUNT_PER_GENDER - male)
                : Math.max(0, REQUIRED_COUNT_PER_GENDER - female);

        return new SessionStatusResponse(male, female, male + female, availableSlots);
    }

    // 대기 순번 조회 (FIFO rank 기반)
    public Integer getQueuePosition(Long userId, GenderType gender) {
        String queueKey = getQueueKey(gender);
        Long rank = redisTemplate.opsForZSet().rank(queueKey, userId.toString());
        return rank != null ? rank.intValue() + 1 : 0;
    }

    // 큐에 있는지 확인
    public boolean isInQueue(Long userId, GenderType gender) {
        String queueKey = getQueueKey(gender);
        Double score = redisTemplate.opsForZSet().score(queueKey, userId.toString());
        return score != null;
    }

    private String getQueueKey(GenderType gender) {
        return gender == GenderType.MALE ? SESSION_QUEUE_MALE : SESSION_QUEUE_FEMALE;
    }

    // [추가] 유저의 매칭된 방 정보(currentRoom) 확인
    public String getUserCurrentRoom(Long userId) {
        String userRoomKey = "user:" + userId + ":currentRoom";
        return stringRedisTemplate.opsForValue().get(userRoomKey);
    }
    
    // [추가] 유저의 currentRoom 키 삭제 (예외 상황용)
    public void removeUserCurrentRoomKey(Long userId) {
        String userRoomKey = "user:" + userId + ":currentRoom";
        redisTemplate.delete(userRoomKey);
    }

    /**
     * 방 관련 Redis 데이터 정리 (좀비 방 방지)
     * @param roomId 방 ID
     */
    public void cleanupRoom(String roomId) {
        log.info("🧹 Redis 방 데이터 정리 시작: roomId={}", roomId);
        
        try {
            // 1. 방 멤버 조회
            String roomMembersKey = "room:" + roomId + ":members";
            java.util.Set<String> memberIds = redisTemplate.opsForSet().members(roomMembersKey);
            
            if (memberIds != null && !memberIds.isEmpty()) {
                for (String userIdStr : memberIds) {
                    // 2. 각 멤버의 currentRoom 매핑 삭제
                    String userRoomKey = "user:" + userIdStr + ":currentRoom";
                    redisTemplate.delete(userRoomKey);
                    
                    // 3. 각 멤버의 방 내 정보 삭제
                    String memberInfoKey = "room:" + roomId + ":member:" + userIdStr;
                    redisTemplate.delete(memberInfoKey);
                }
                log.info("  - 멤버 {}명 매핑 삭제 완료", memberIds.size());
            }
            
            // 4. 멤버 목록 Set 삭제
            redisTemplate.delete(roomMembersKey);
            
            // 5. 방 생성 시간 정보 삭제
            String roomCreatedKey = "room:" + roomId + ":created";
            redisTemplate.delete(roomCreatedKey);
            
            log.info("✅ Redis 방 데이터 정리 완료: roomId={}", roomId);
            
        } catch (Exception e) {
            log.error("Redis 방 데이터 정리 중 오류: roomId={}", roomId, e);
        }
    }
}
