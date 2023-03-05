import { redisPrefix } from '@app/lib/config';
import redis from '@app/lib/redis';

interface TypeSafeCacheUtil<Key, Value> {
  set(key: Key, value: Value, ttl?: number): Promise<void>;

  get(key: Key): Promise<Value | null>;

  del(key: Key): Promise<void>;
}

export function TypedCache<K, V>(toRedisKey: (v: K) => string): TypeSafeCacheUtil<K, V> {
  const buildKey = (key: K) => `${redisPrefix}:${toRedisKey(key)}`;

  return {
    async set(key: K, value, ttl = 60) {
      await redis.set(buildKey(key), JSON.stringify(value), 'EX', ttl);
    },
    async get(key: K): Promise<V | null> {
      const cached = await redis.get(buildKey(key));
      if (cached) {
        return JSON.parse(cached) as V;
      }

      return null;
    },
    async del(key: K): Promise<void> {
      await redis.del(buildKey(key));
    },
  };
}
