-- Rate Limit with INCR + EXPIRE
-- 1분에 N회 제한 체크

local key = KEYS[1]           -- 'verify:rate:{userId}'
local maxCount = tonumber(ARGV[1])    -- rate limit count (예: 3)
local ttlSeconds = tonumber(ARGV[2])  -- TTL (예: 60초)

-- 현재 시도 횟수 증가
local attempts = redis.call('INCR', key)

-- 첫 요청이면 TTL 설정
if attempts == 1 then
    redis.call('EXPIRE', key, ttlSeconds)
end

-- 제한 초과 여부 반환
if attempts > maxCount then
    return {
        'EXCEEDED',
        attempts
    }
else
    return {
        'ALLOWED',
        attempts
    }
end
