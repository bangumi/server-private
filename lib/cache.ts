import { redisPrefix } from '@app/lib/config.ts';
import redis from '@app/lib/redis.ts';

interface TypeSafeCacheUtil<Key, Value> {
  set(key: Key, value: Value, ttl?: number): Promise<void>;

  get(key: Key): Promise<Value | null>;

  del(key: Key): Promise<void>;

  cached(key: Key, getter: () => Promise<Value | null>, ttl?: number): Promise<Value | null>;
}

class TypedCacheImpl<K, V> implements TypeSafeCacheUtil<K, V> {
  private readonly buildKey: (key: K) => string;
  private readonly defaultTTL: number;

  constructor(toRedisKey: (v: K) => string, defaultTTL = 60) {
    this.buildKey = (key: K) => `${redisPrefix}:${toRedisKey(key)}`;
    this.defaultTTL = defaultTTL;
  }

  async set(key: K, value: V, ttl = this.defaultTTL): Promise<void> {
    await redis.set(this.buildKey(key), JSON.stringify(value), 'EX', ttl);
  }

  async get(key: K): Promise<V | null> {
    const cached = await redis.get(this.buildKey(key));
    if (cached) {
      return JSON.parse(cached) as V;
    }
    return null;
  }

  async del(key: K): Promise<void> {
    await redis.del(this.buildKey(key));
  }

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
  }
}

export function TypedCache<K, V>(
  toRedisKey: (v: K) => string,
  defaultTTL = 60,
): TypeSafeCacheUtil<K, V> {
  return new TypedCacheImpl<K, V>(toRedisKey, defaultTTL);
}
