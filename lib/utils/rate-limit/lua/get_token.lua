--rate limiter key prefix
local key = KEYS[1]

--rate limit
local limit = ARGV[1]

--rate limit duration
local duration = ARGV[2]

local token_remain = redis.call('get', key);

--if have such key
if token_remain then
    --decuct the key directly
    token_remain = redis.call('decr', key);

    if token_remain < -1 then
        token_remain = -1;
    end

    local time_to_reset = redis.call('ttl', key);

    return {token_remain, time_to_reset}
else
    --if no such key, create a key and store the remaining key in db
    redis.call('set', key, limit - 1, 'PX', duration * 1000);
    return {limit - 1, duration}
end