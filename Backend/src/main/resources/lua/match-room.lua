-- Twin Cursor 매칭 로직 (남3녀3) - SortedSet 기반 FIFO
-- 선착순으로 공정하게 매칭

local maleQueueKey = KEYS[1]      -- 'session:male'
local femaleQueueKey = KEYS[2]    -- 'session:female'
-- local roomIdKey = KEYS[3]  (No longer used, using UUID from ARGV)

local requiredMale = 3
local requiredFemale = 3

-- 인증 소비, 대기열 등록, 기존 방 확인을 매칭과 같은 원자적 실행에 포함한다.
local userId = ARGV[2]
local gender = ARGV[3]
local now = redis.call('TIME')
local nowMillis = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)
local maleLeaseKey = KEYS[4]
local femaleLeaseKey = KEYS[5]

-- 폴링이 끊긴 사용자는 30초 후 제외한다. FIFO 점수는 최초 입장 시각을 유지한다.
for _, pair in ipairs({{maleQueueKey, maleLeaseKey}, {femaleQueueKey, femaleLeaseKey}}) do
    redis.call('ZREMRANGEBYSCORE', pair[2], '-inf', nowMillis)
    redis.call('ZINTERSTORE', pair[1], 2, pair[1], pair[2], 'WEIGHTS', 1, 0)
end

local currentRoomKey = 'user:' .. userId .. ':currentRoom'
local existingRoom = redis.call('GET', currentRoomKey)
if existingRoom then
    if redis.call('EXISTS', 'room:' .. existingRoom .. ':member:' .. userId) == 1 then
        return {'MATCHED', existingRoom, '[]', '[]'}
    end
    redis.call('DEL', currentRoomKey)
end

local queueKey = gender == 'MALE' and maleQueueKey or femaleQueueKey
local leaseKey = gender == 'MALE' and maleLeaseKey or femaleLeaseKey
if not redis.call('ZSCORE', queueKey, userId) then
    if redis.call('GET', KEYS[3]) ~= 'VERIFIED' then return {'REJECTED'} end
    redis.call('DEL', KEYS[3])
    redis.call('ZADD', queueKey, nowMillis, userId)
end
redis.call('ZADD', leaseKey, nowMillis + 30000, userId)

-- 1. 현재 큐 인원 확인
local maleCount = redis.call('ZCARD', maleQueueKey)
local femaleCount = redis.call('ZCARD', femaleQueueKey)

-- 2. 매칭 조건 미충족
if maleCount < requiredMale or femaleCount < requiredFemale then
    return {
        'WAITING',
        maleCount,
        femaleCount
    }
end

-- 3. 매칭 조건 충족 → 방 생성
-- 3-1. 선착순으로 남/녀 각 3명씩 선택 (타임스탬프 오름차순)
local maleMembers = redis.call('ZRANGE', maleQueueKey, 0, requiredMale - 1)
local femaleMembers = redis.call('ZRANGE', femaleQueueKey, 0, requiredFemale - 1)

-- 3-2. 방 ID 사용 (Java에서 UUID 전달)
local roomId = ARGV[1]

-- 3-3. 선택된 유저들을 큐에서 제거
for i, userId in ipairs(maleMembers) do
    redis.call('ZREM', maleQueueKey, userId)
    redis.call('ZREM', maleLeaseKey, userId)
end
for i, userId in ipairs(femaleMembers) do
    redis.call('ZREM', femaleQueueKey, userId)
    redis.call('ZREM', femaleLeaseKey, userId)
end

-- 3-4. 방 멤버 저장 (TTL 2시간)
local roomMembersKey = 'room:' .. roomId .. ':members'
redis.call('SADD', roomMembersKey, unpack(maleMembers))
redis.call('SADD', roomMembersKey, unpack(femaleMembers))
redis.call('EXPIRE', roomMembersKey, 7200)  -- 2시간 TTL

-- 멤버 정보 저장 (성별만 저장)
for i, userId in ipairs(maleMembers) do
    local memberInfoKey = 'room:' .. roomId .. ':member:' .. userId
    redis.call('HSET', memberInfoKey, 'gender', 'MALE')
    redis.call('EXPIRE', memberInfoKey, 7200)
    
    -- [추가] userId -> roomId 매핑 저장
    local userRoomKey = 'user:' .. userId .. ':currentRoom'
    redis.call('SET', userRoomKey, roomId)
    redis.call('EXPIRE', userRoomKey, 7200)
end

for i, userId in ipairs(femaleMembers) do
    local memberInfoKey = 'room:' .. roomId .. ':member:' .. userId
    redis.call('HSET', memberInfoKey, 'gender', 'FEMALE')
    redis.call('EXPIRE', memberInfoKey, 7200)

    -- [추가] userId -> roomId 매핑 저장
    local userRoomKey = 'user:' .. userId .. ':currentRoom'
    redis.call('SET', userRoomKey, roomId)
    redis.call('EXPIRE', userRoomKey, 7200)
end

-- 3-5. 방 생성 시간 저장
redis.call('SET', 'room:' .. roomId .. ':created', redis.call('TIME')[1])
redis.call('EXPIRE', 'room:' .. roomId .. ':created', 7200)

-- 4. 성공 응답
-- 요청자보다 앞선 6명이 매칭되었을 수도 있으므로 본인에게 배정된 방만 반환한다.
if redis.call('GET', currentRoomKey) ~= roomId then
    return {'WAITING', redis.call('ZCARD', maleQueueKey), redis.call('ZCARD', femaleQueueKey)}
end
return {
    'MATCHED',
    roomId,
    cjson.encode(maleMembers),
    cjson.encode(femaleMembers)
}
