-- 현재 매칭과 방 정리 사이에 다른 Redis 명령이 끼어들지 않도록 원자 처리한다.
-- 기존 매칭 스크립트와 동일하게 단일 Redis 인스턴스를 전제로 한다.
local roomId = ARGV[1]
local members = redis.call('SMEMBERS', KEYS[1])
for _, userId in ipairs(members) do
    local currentRoomKey = 'user:' .. userId .. ':currentRoom'
    if redis.call('GET', currentRoomKey) == roomId then
        redis.call('DEL', currentRoomKey)
    end
    redis.call('DEL', 'room:' .. roomId .. ':member:' .. userId)
end
redis.call('DEL', KEYS[1], KEYS[2])
return #members
