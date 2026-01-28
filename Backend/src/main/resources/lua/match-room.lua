-- Twin Cursor 매칭 로직 (남3녀3) - SortedSet 기반 FIFO
-- 선착순으로 공정하게 매칭 + 각 유저에게 번호 부여

local maleQueueKey = KEYS[1]      -- 'session:male'
local femaleQueueKey = KEYS[2]    -- 'session:female'
local roomIdKey = KEYS[3]         -- 'room:id' (auto increment)

local requiredMale = 3
local requiredFemale = 3

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

-- 3-2. 방 ID 생성
local roomId = redis.call('INCR', roomIdKey)

-- 3-3. 선택된 유저들을 큐에서 제거
for i, userId in ipairs(maleMembers) do
    redis.call('ZREM', maleQueueKey, userId)
end
for i, userId in ipairs(femaleMembers) do
    redis.call('ZREM', femaleQueueKey, userId)
end

-- 3-4. 방 멤버 저장 (TTL 10분) + 각 멤버에게 번호 부여
local roomMembersKey = 'room:' .. roomId .. ':members'
redis.call('SADD', roomMembersKey, unpack(maleMembers))
redis.call('SADD', roomMembersKey, unpack(femaleMembers))
redis.call('EXPIRE', roomMembersKey, 600)  -- 10분 TTL

-- 남자 멤버들에게 1, 2, 3호 부여
for i, userId in ipairs(maleMembers) do
    local memberInfoKey = 'room:' .. roomId .. ':member:' .. userId
    redis.call('HSET', memberInfoKey, 'gender', 'MALE', 'number', i)
    redis.call('EXPIRE', memberInfoKey, 600)
end

-- 여자 멤버들에게 1, 2, 3호 부여
for i, userId in ipairs(femaleMembers) do
    local memberInfoKey = 'room:' .. roomId .. ':member:' .. userId
    redis.call('HSET', memberInfoKey, 'gender', 'FEMALE', 'number', i)
    redis.call('EXPIRE', memberInfoKey, 600)
end

-- 3-5. 방 생성 시간 저장
redis.call('SET', 'room:' .. roomId .. ':created', redis.call('TIME')[1])
redis.call('EXPIRE', 'room:' .. roomId .. ':created', 600)

-- 4. 성공 응답
return {
    'MATCHED',
    roomId,
    cjson.encode(maleMembers),
    cjson.encode(femaleMembers)
}
