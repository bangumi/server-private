import memcached from '@app/lib/memcached.ts';

import { EventOp, type KafkaMessage } from './type';

interface LikeRow {
  type: number;
  main_id: number;
}

interface LikePayload {
  op: EventOp;
  before: LikeRow | null;
  after: LikeRow | null;
}

export async function handle({ value }: KafkaMessage) {
  const payload = JSON.parse(value.toString()) as LikePayload;
  if (payload.op === EventOp.Snapshot) {
    return;
  }

  const row = payload.after ?? payload.before;
  if (!row) {
    return;
  }

  // 旧站按 main_id 缓存整页贴贴列表，见 LikeCore::fetchGroupedCache
  await memcached?.delete(`likes_grouped_${row.type}_${row.main_id}`);
}
