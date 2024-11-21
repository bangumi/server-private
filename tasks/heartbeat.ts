import redis from '@app/lib/redis.ts';

export async function heartbeat() {
  const now = Date.now();
  await redis.set('task:heartbeat', now);
}
