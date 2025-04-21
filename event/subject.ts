import { parse } from '@bgm38/wiki';

import { db, op, schema } from '@app/drizzle';
import redis from '@app/lib/redis.ts';
import {
  getEpCacheKey,
  getItemCacheKey,
  getSlimCacheKey,
  getTopicCacheKey,
} from '@app/lib/subject/cache';
import { extractDate } from '@app/lib/subject/date';
import { sleep } from '@app/lib/utils';

import { EventOp } from './type';

interface SubjectKey {
  subject_id: number;
}

interface Payload {
  op: EventOp;
  source: {
    ts_ms: number;
  };
}

export async function handle(topic: string, key: string, value: string) {
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

export async function handleFields(topic: string, key: string, value: string) {
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

export async function handleTopic(topic: string, key: string, value: string) {
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

export async function handleEpisode(topic: string, key: string, value: string) {
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

interface SubjectRevKey {
  rev_subject_id: number;
}

export async function handleSubjectDate(topic: string, key: string, value: string) {
  let subjectID: number;
  if (topic.endsWith('.chii_subject_revisions')) {
    const idx = JSON.parse(key) as SubjectRevKey;
    subjectID = idx.rev_subject_id;
  } else if (topic.endsWith('.chii_subjects')) {
    const idx = JSON.parse(key) as SubjectKey;
    subjectID = idx.subject_id;
  } else {
    return;
  }

  const payload = JSON.parse(value) as Payload;
  switch (payload.op) {
    case EventOp.Update:
    case EventOp.Create: {
      await updateSubjectDate(subjectID, payload.source.ts_ms);
    }
  }
}

async function updateSubjectDate(subjectID: number, ts: number) {
  if (Date.now() <= ts + 2000) {
    await sleep(2000);
  }

  const [subject] = await db
    .select()
    .from(schema.chiiSubjects)
    .where(op.eq(schema.chiiSubjects.id, subjectID))
    .limit(1);
  if (!subject) {
    return;
  }

  let w;
  try {
    w = parse(subject.infobox);
  } catch {
    return;
  }

  const date = extractDate(w, subject.typeID, subject.platform);
  if (date.year <= 1900) {
    return;
  }

  await db
    .update(schema.chiiSubjectFields)
    .set({
      year: date.year,
      month: date.month,
      date: date.toString(),
    })
    .where(op.eq(schema.chiiSubjectFields.id, subjectID));
}
