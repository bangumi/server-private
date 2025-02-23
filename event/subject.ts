import redis from '@app/lib/redis.ts';
import {
  getEpCacheKey,
  getItemCacheKey,
  getSlimCacheKey,
  getTopicCacheKey,
} from '@app/lib/subject/cache';

import { EventOp } from './type';

interface SubjectKey {
  subject_id: number;
}

interface Payload {
  op: EventOp;
}

export async function handle(key: string, value: string) {
  const idx = JSON.parse(key) as SubjectKey;
  const payload = JSON.parse(value) as Payload;
  switch (payload.op) {
    case EventOp.Create: {
      break;
    }
    case EventOp.Update:
    case EventOp.Delete: {
      await redis.del(getItemCacheKey(idx.subject_id), getSlimCacheKey(idx.subject_id));
      break;
    }
    case EventOp.Snapshot: {
      break;
    }
  }
}

interface FieldsKey {
  field_sid: number;
}

export async function handleFields(key: string, value: string) {
  const idx = JSON.parse(key) as FieldsKey;
  const payload = JSON.parse(value) as Payload;
  switch (payload.op) {
    case EventOp.Create: {
      break;
    }
    case EventOp.Update:
    case EventOp.Delete: {
      await redis.del(getItemCacheKey(idx.field_sid), getSlimCacheKey(idx.field_sid));
      break;
    }
    case EventOp.Snapshot: {
      break;
    }
  }
}

interface TopicKey {
  sbj_tpc_id: number;
}

export async function handleTopic(key: string, value: string) {
  const idx = JSON.parse(key) as TopicKey;
  const payload = JSON.parse(value) as Payload;
  switch (payload.op) {
    case EventOp.Create: {
      break;
    }
    case EventOp.Update:
    case EventOp.Delete: {
      await redis.del(getTopicCacheKey(idx.sbj_tpc_id));
      break;
    }
    case EventOp.Snapshot: {
      break;
    }
  }
}

interface EpisodeKey {
  ep_id: number;
}

export async function handleEpisode(key: string, value: string) {
  const idx = JSON.parse(key) as EpisodeKey;
  const payload = JSON.parse(value) as Payload;
  switch (payload.op) {
    case EventOp.Create: {
      break;
    }
    case EventOp.Update:
    case EventOp.Delete: {
      await redis.del(getEpCacheKey(idx.ep_id));
      break;
    }
    case EventOp.Snapshot: {
      break;
    }
  }
}
