# 关于时间线的缓存策略

## 目前时间线请求分两种

### 用户时间胶囊

缓存 tml_id 到 redis `tml:user:{uid}` 为 sorted set, 以 tml_id 为 score，整个 key 的过期时间为 14 天

1. 收到请求 /p1/users/{username}/timeline, 设置访问 key `tml:visit:user:${uid}`, 过期时间 14 天
2. 尝试从缓存 `tml:user:{uid}` 里获取，如果能覆盖当前的 limit 请求，则直接 range 返回缓存里的 tml_id, 否则请求数据库
3. 从 redis mget 上一步拿到的 tml_id 列表，missing 的部分请求数据库

### 首页时间线

缓存 tml_id 到 redis `tml:inbox:{uid}` 为 sorted set, 以 tml_id 为 score，整个 key 的过期时间为 14 天

1. 收到请求 /p1/timeline, 设置访问 key `tml:visit:inbox:{uid}`, 过期时间 14 天
2. 尝试从缓存 `tml:inbox:{uid}` 里获取，如果能覆盖当前的 limit 请求，则直接 range 返回缓存里的 tml_id, 否则请求数据库
3. 从 redis mget 上一步拿到的 tml_id 列表，missing 的部分请求数据库

## 关于 MQ 里对缓存的更新

MQ 从 kafka 消费 debezium 的 binlog，然后更新缓存

### create

- 检查 `tml:visit:user:${tml_uid}` 是否存在，更新 `tml:user:{tml_uid}`，zadd 新的 tml_id
- 设置 `tml:user:{tml_uid}` 的过期时间与 `tml:visit:user:${tml_uid}` 一致
- 获取 tml_uid 的好友，检查对应每个人的 `tml:visit:inbox:{follower_uid}` 是否存在，更新 `tml:inbox:{follower_uid}`，zadd 新的 tml_id
- 设置每个 `tml:inbox:{follower_uid}` 的过期时间与 `tml:visit:inbox:{follower_uid}` 一致

### delete

- 清除 `tml:item:{tml_id}` 的缓存
- zrem `tml:user:{uid}` 里相应的 tml_id
- 获取 tml_uid 的好友，zrem 所有 `tml:inbox:{follower_uid}` 里相应的 tml_id

### update

清除 `tml:item:{tml_id}` 的缓存，下次请求的时候会重新请求数据库并回填 cache

## CRON 任务清理时间线缓存

- 每 10 分钟 truncate 一次 `tml:inbox:0`，即全站时间线，只保留最新的 1000 条

- 每天凌晨 4 点，scan 并 truncate 所有 `tml:inbox:*`，只保留最新的 1000 条

- 每天凌晨 5 点，scan 并 truncate 所有 `tml:user:*`，只保留最新的 1000 条
