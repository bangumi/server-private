import { redisPrefix } from '@app/lib/config';
import redis from '@app/lib/redis';

interface TypeSafeCacheUtil<Key, Value> {
  set(key: Key, value: Value, ttl?: number): Promise<void>;

  get(key: Key): Promise<Value | null>;

  del(key: Key): Promise<void>;

  cached(key: Key, getter: () => Promise<Value | null>, ttl?: number): Promise<Value | null>;
}

export function TypedCache<K, V>(
  toRedisKey: (v: K) => string,
  defaultTTL = 60,
): TypeSafeCacheUtil<K, V> {
  const buildKey = (key: K) => `${redisPrefix}:${toRedisKey(key)}`;

  return {
    async set(key: K, value, ttl = defaultTTL) {
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

    async cached(key: K, getter: () => Promise<V | null>, ttl?: number): Promise<V | null> {
      const cached = await this.get(key);
      if (cached) {
        return cached;
      }

      const data = await getter();
      if (!data) {
        return null;
      }

      await this.set(key, data, ttl);

      return data;
    },
  };
}
