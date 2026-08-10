import { DateTime } from 'luxon';

import { db, op, schema } from '@app/drizzle';
import redis from '@app/lib/redis.ts';
import { CommentState, TopicDisplay } from '@app/lib/topic/type.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import type * as res from '@app/lib/types/res.ts';

import { getHotSubjectTopicsCacheKey } from './cache.ts';

const CACHE_TTL = 600;
const TOPIC_LIMIT = 30;
const RESULT_LIMIT = 5;

/** Cached: 热门条目讨论，对齐 PHP ChartCore::SubjectTopicWeekly */
export async function fetchHotSubjectTopics(allowNsfw: boolean): Promise<res.ISubjectTopic[]> {
  const cacheKey = getHotSubjectTopicsCacheKey();
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as res.ISubjectTopic[];
  }

  const start = DateTime.now().toUnixInteger() - 86400;
  const hot = await db
    .select({ mid: schema.chiiSubjectPosts.mid })
    .from(schema.chiiSubjectPosts)
    .where(op.gt(schema.chiiSubjectPosts.createdAt, start))
    .groupBy(schema.chiiSubjectPosts.mid)
    .orderBy(op.desc(op.count()))
    .limit(TOPIC_LIMIT);
  const mids = hot.map((x) => x.mid);
  if (mids.length === 0) {
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify([]));
    return [];
  }

  const topics = await db
    .select()
    .from(schema.chiiSubjectTopics)
    .innerJoin(
      schema.chiiSubjects,
      op.eq(schema.chiiSubjectTopics.subjectID, schema.chiiSubjects.id),
    )
    .where(
      op.and(
        op.inArray(schema.chiiSubjectTopics.id, mids),
        op.eq(schema.chiiSubjectTopics.display, TopicDisplay.Normal),
        op.eq(schema.chiiSubjectTopics.state, CommentState.Normal),
        op.eq(schema.chiiSubjects.nsfw, false),
      ),
    )
    .orderBy(op.desc(schema.chiiSubjectTopics.updatedAt))
    .limit(RESULT_LIMIT);

  const subjectIDs = topics.map((x) => x.chii_subject_topics.subjectID);
  const subjects = await fetcher.fetchSlimSubjectsByIDs(subjectIDs, allowNsfw);
  const creatorIDs = topics.map((x) => x.chii_subject_topics.uid);
  const users = await fetcher.fetchSlimUsersByIDs(creatorIDs);

  const result: res.ISubjectTopic[] = [];
  for (const { chii_subject_topics: topic } of topics) {
    const item = convert.toSubjectTopic(topic);
    const subject = subjects[item.parentID];
    const creator = users[item.creatorID];
    if (!subject || !creator) {
      continue;
    }
    result.push({
      ...item,
      subject,
      creator,
      replies: [],
    });
  }
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
  return result;
}
