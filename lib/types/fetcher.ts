import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import redis from '@app/lib/redis.ts';
import {
  getItemCacheKey as getSubjectItemCacheKey,
  getListCacheKey as getSubjectListCacheKey,
  getSlimCacheKey as getSubjectSlimCacheKey,
} from '@app/lib/subject/cache.ts';
import {
  type SubjectFilter,
  SubjectSort,
  TagCat,
  type UserEpisodeCollection,
} from '@app/lib/subject/type.ts';
import { getItemCacheKey as getTimelineItemCacheKey } from '@app/lib/timeline/cache.ts';
import { getSubjectTrendingKey } from '@app/lib/trending/subject.ts';
import { type TrendingItem, TrendingPeriod } from '@app/lib/trending/type.ts';

import * as convert from './convert.ts';
import type * as res from './res.ts';

export async function fetchSlimUserByUsername(username: string): Promise<res.ISlimUser | null> {
  const data = await db
    .select()
    .from(schema.chiiUsers)
    .where(op.eq(schema.chiiUsers.username, username))
    .execute();
  for (const d of data) {
    return convert.toSlimUser(d);
  }
  return null;
}

export async function fetchSlimUsersByIDs(ids: number[]): Promise<Record<number, res.ISlimUser>> {
  const data = await db
    .select()
    .from(schema.chiiUsers)
    .where(op.inArray(schema.chiiUsers.id, ids))
    .execute();
  const result: Record<number, res.ISlimUser> = {};
  for (const d of data) {
    result[d.id] = convert.toSlimUser(d);
  }
  return result;
}

export async function fetchFriendIDsByUserID(userID: number): Promise<number[]> {
  const data = await db
    .select({ fid: schema.chiiFriends.fid })
    .from(schema.chiiFriends)
    .where(op.eq(schema.chiiFriends.uid, userID))
    .execute();
  return data.map((d) => d.fid);
}

export async function fetchSlimSubjectByID(
  id: number,
  allowNsfw = false,
): Promise<res.ISlimSubject | null> {
  const cached = await redis.get(getSubjectSlimCacheKey(id));
  if (cached) {
    const slim = JSON.parse(cached) as res.ISlimSubject;
    if (!allowNsfw && slim.nsfw) {
      return null;
    } else {
      return slim;
    }
  }
  const [data] = await db
    .select()
    .from(schema.chiiSubjects)
    .where(op.and(op.eq(schema.chiiSubjects.id, id), op.ne(schema.chiiSubjects.ban, 1)))
    .execute();
  if (!data) {
    return null;
  }
  const slim = convert.toSlimSubject(data);
  await redis.setex(getSubjectSlimCacheKey(id), 2592000, JSON.stringify(slim));
  if (!allowNsfw && slim.nsfw) {
    return null;
  }
  return slim;
}

export async function fetchSlimSubjectsByIDs(
  ids: number[],
  allowNsfw = false,
): Promise<Record<number, res.ISlimSubject>> {
  const cached = await redis.mget(ids.map((id) => getSubjectSlimCacheKey(id)));
  const result: Record<number, res.ISlimSubject> = {};
  const missing = [];
  for (const id of ids) {
    if (cached[id]) {
      const slim = JSON.parse(cached[id]) as res.ISlimSubject;
      if (!allowNsfw && slim.nsfw) {
        continue;
      }
      result[id] = slim;
    } else {
      missing.push(id);
    }
  }
  if (missing.length > 0) {
    const data = await db
      .select()
      .from(schema.chiiSubjects)
      .where(op.and(op.inArray(schema.chiiSubjects.id, missing), op.ne(schema.chiiSubjects.ban, 1)))
      .execute();
    for (const d of data) {
      const slim = convert.toSlimSubject(d);
      await redis.setex(getSubjectSlimCacheKey(d.id), 2592000, JSON.stringify(slim));
      if (!allowNsfw && slim.nsfw) {
        continue;
      }
      result[d.id] = slim;
    }
  }
  return result;
}

export async function fetchSubjectByID(
  id: number,
  allowNsfw = false,
): Promise<res.ISubject | null> {
  const cached = await redis.get(getSubjectItemCacheKey(id));
  if (cached) {
    const item = JSON.parse(cached) as res.ISubject;
    if (!allowNsfw && item.nsfw) {
      return null;
    }
    return item;
  }
  const [data] = await db
    .select()
    .from(schema.chiiSubjects)
    .innerJoin(schema.chiiSubjectFields, op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id))
    .where(op.and(op.eq(schema.chiiSubjects.id, id), op.ne(schema.chiiSubjects.ban, 1)))
    .execute();
  if (!data) {
    return null;
  }
  const item = convert.toSubject(data.chii_subjects, data.chii_subject_fields);
  await redis.setex(getSubjectItemCacheKey(id), 2592000, JSON.stringify(item));
  if (!allowNsfw && item.nsfw) {
    return null;
  }
  return item;
}

export async function fetchSubjectsByIDs(
  ids: number[],
  allowNsfw = false,
): Promise<Map<number, res.ISubject>> {
  const cached = await redis.mget(ids.map((id) => getSubjectItemCacheKey(id)));
  const result = new Map<number, res.ISubject>();
  const missing = [];

  for (const id of ids) {
    if (cached[id]) {
      const subject = JSON.parse(cached[id]) as res.ISubject;
      if (!allowNsfw && subject.nsfw) {
        continue;
      }
      result.set(id, subject);
    } else {
      missing.push(id);
    }
  }

  if (missing.length > 0) {
    const data = await db
      .select()
      .from(schema.chiiSubjects)
      .innerJoin(
        schema.chiiSubjectFields,
        op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id),
      )
      .where(op.and(op.inArray(schema.chiiSubjects.id, missing), op.ne(schema.chiiSubjects.ban, 1)))
      .execute();

    for (const d of data) {
      const item = convert.toSubject(d.chii_subjects, d.chii_subject_fields);
      await redis.setex(getSubjectItemCacheKey(item.id), 2592000, JSON.stringify(item));
      if (!allowNsfw && item.nsfw) {
        continue;
      }
      result.set(item.id, item);
    }
  }
  return result;
}

export async function fetchSubjectIDsByFilter(
  filter: SubjectFilter,
  sort: SubjectSort,
  page: number,
): Promise<number[]> {
  const cacheKey = getSubjectListCacheKey(filter, sort, page);
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as number[];
  }
  if (sort === SubjectSort.Trends) {
    const trendingKey = getSubjectTrendingKey(filter.type, TrendingPeriod.Month);
    const data = await redis.get(trendingKey);
    if (!data) {
      return [];
    }
    const ids = JSON.parse(data) as TrendingItem[];
    filter.ids = ids.map((item) => item.id);
  }
  if (filter.tags) {
    const ids = await db
      .selectDistinct({ id: schema.chiiTagList.mainID })
      .from(schema.chiiTagList)
      .innerJoin(schema.chiiTagIndex, op.eq(schema.chiiTagIndex.id, schema.chiiTagList.tagID))
      .where(
        op.and(
          op.inArray(schema.chiiTagIndex.name, filter.tags),
          op.eq(schema.chiiTagIndex.cat, TagCat.Meta),
        ),
      )
      .execute();
    if (filter.ids) {
      filter.ids = filter.ids.filter((id) => ids.some((item) => item.id === id));
    } else {
      filter.ids = ids.map((item) => item.id);
    }
  }

  const conditions = [
    op.eq(schema.chiiSubjects.typeID, filter.type),
    op.ne(schema.chiiSubjects.ban, 1),
  ];
  if (!filter.nsfw) {
    conditions.push(op.eq(schema.chiiSubjects.nsfw, false));
  }
  if (filter.cat) {
    conditions.push(op.eq(schema.chiiSubjects.platform, filter.cat));
  }
  if (filter.series) {
    conditions.push(op.eq(schema.chiiSubjects.series, filter.series));
  }
  if (filter.year) {
    conditions.push(op.eq(schema.chiiSubjectFields.year, filter.year));
  }
  if (filter.month) {
    conditions.push(op.eq(schema.chiiSubjectFields.month, filter.month));
  }
  if (filter.ids) {
    conditions.push(op.inArray(schema.chiiSubjects.id, filter.ids));
  }

  const sorts = [];
  switch (sort) {
    case SubjectSort.Rank: {
      conditions.push(op.ne(schema.chiiSubjectFields.fieldRank, 0));
      sorts.push(op.asc(schema.chiiSubjectFields.fieldRank));
      break;
    }
    case SubjectSort.Trends: {
      break;
    }
    case SubjectSort.Collects: {
      sorts.push(op.desc(schema.chiiSubjects.done));
      break;
    }
    case SubjectSort.Date: {
      sorts.push(op.desc(schema.chiiSubjectFields.date));
      break;
    }
    case SubjectSort.Title: {
      sorts.push(op.asc(schema.chiiSubjects.name));
      break;
    }
  }
  const query = db
    .select({ id: schema.chiiSubjects.id })
    .from(schema.chiiSubjects)
    .innerJoin(schema.chiiSubjectFields, op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id))
    .where(op.and(...conditions));
  if (sort === SubjectSort.Trends) {
    if (!filter.ids) {
      return [];
    }
    query.orderBy(op.sql`find_in_set(id, ${filter.ids.join(',')})`);
  } else {
    query.orderBy(...sorts);
  }
  const data = await query
    .limit(24)
    .offset((page - 1) * 24)
    .execute();
  const ids = data.map((d) => d.id);
  if (page === 1) {
    await redis.setex(cacheKey, 86400, JSON.stringify(ids));
  } else {
    await redis.setex(cacheKey, 3600, JSON.stringify(ids));
  }
  return ids;
}

export async function fetchSubjectEpStatus(
  userID: number,
  subjectID: number,
): Promise<Record<number, UserEpisodeCollection>> {
  const data = await db
    .select()
    .from(schema.chiiEpStatus)
    .where(
      op.and(op.eq(schema.chiiEpStatus.uid, userID), op.eq(schema.chiiEpStatus.sid, subjectID)),
    )
    .execute();
  for (const d of data) {
    return convert.toSubjectEpStatus(d);
  }
  return {};
}

export async function fetchSlimCharacterByID(
  id: number,
  allowNsfw = false,
): Promise<res.ISlimCharacter | null> {
  const data = await db
    .select()
    .from(schema.chiiCharacters)
    .where(
      op.and(
        op.eq(schema.chiiCharacters.id, id),
        op.ne(schema.chiiCharacters.ban, 1),
        allowNsfw ? undefined : op.eq(schema.chiiCharacters.nsfw, false),
      ),
    )
    .execute();
  for (const d of data) {
    return convert.toSlimCharacter(d);
  }
  return null;
}

export async function fetchSlimPersonByID(
  id: number,
  allowNsfw = false,
): Promise<res.ISlimPerson | null> {
  const data = await db
    .select()
    .from(schema.chiiPersons)
    .where(
      op.and(
        op.eq(schema.chiiPersons.id, id),
        op.ne(schema.chiiPersons.ban, 1),
        allowNsfw ? undefined : op.eq(schema.chiiPersons.nsfw, false),
      ),
    )
    .execute();
  for (const d of data) {
    return convert.toSlimPerson(d);
  }
  return null;
}

export async function fetchCastsBySubjectAndCharacterIDs(
  subjectID: number,
  characterIDs: number[],
  allowNsfw: boolean,
): Promise<Map<number, res.ISlimPerson[]>> {
  const data = await db
    .select()
    .from(schema.chiiCharacterCasts)
    .innerJoin(
      schema.chiiPersons,
      op.and(op.eq(schema.chiiCharacterCasts.personID, schema.chiiPersons.id)),
    )
    .where(
      op.and(
        op.eq(schema.chiiCharacterCasts.subjectID, subjectID),
        op.inArray(schema.chiiCharacterCasts.characterID, characterIDs),
        op.ne(schema.chiiPersons.ban, 1),
        allowNsfw ? undefined : op.eq(schema.chiiPersons.nsfw, false),
      ),
    )
    .execute();
  const map = new Map<number, res.ISlimPerson[]>();
  for (const d of data) {
    const person = convert.toSlimPerson(d.chii_persons);
    const list = map.get(d.chii_crt_cast_index.characterID) || [];
    list.push(person);
    map.set(d.chii_crt_cast_index.characterID, list);
  }
  return map;
}

export async function fetchCastsByCharacterAndSubjectIDs(
  characterID: number,
  subjectIDs: number[],
  allowNsfw: boolean,
): Promise<Map<number, res.ISlimPerson[]>> {
  const data = await db
    .select()
    .from(schema.chiiCharacterCasts)
    .innerJoin(
      schema.chiiPersons,
      op.and(op.eq(schema.chiiCharacterCasts.personID, schema.chiiPersons.id)),
    )
    .where(
      op.and(
        op.eq(schema.chiiCharacterCasts.characterID, characterID),
        op.inArray(schema.chiiCharacterCasts.subjectID, subjectIDs),
        op.ne(schema.chiiPersons.ban, 1),
        allowNsfw ? undefined : op.eq(schema.chiiPersons.nsfw, false),
      ),
    )
    .execute();
  const map = new Map<number, res.ISlimPerson[]>();
  for (const d of data) {
    const person = convert.toSlimPerson(d.chii_persons);
    const list = map.get(d.chii_crt_cast_index.subjectID) || [];
    list.push(person);
    map.set(d.chii_crt_cast_index.subjectID, list);
  }
  return map;
}

export async function fetchCastsByPersonAndCharacterIDs(
  personID: number,
  characterIDs: number[],
  subjectType: number | undefined,
  type: number | undefined,
  allowNsfw: boolean,
): Promise<Map<number, res.ICharacterSubjectRelation[]>> {
  const data = await db
    .select()
    .from(schema.chiiCharacterCasts)
    .innerJoin(
      schema.chiiSubjects,
      op.and(op.eq(schema.chiiCharacterCasts.subjectID, schema.chiiSubjects.id)),
    )
    .innerJoin(
      schema.chiiCharacterSubjects,
      op.and(
        op.eq(schema.chiiCharacterCasts.characterID, schema.chiiCharacterSubjects.characterID),
        op.eq(schema.chiiCharacterCasts.subjectID, schema.chiiCharacterSubjects.subjectID),
      ),
    )
    .where(
      op.and(
        op.eq(schema.chiiCharacterCasts.personID, personID),
        op.inArray(schema.chiiCharacterCasts.characterID, characterIDs),
        subjectType ? op.eq(schema.chiiCharacterCasts.subjectType, subjectType) : undefined,
        type ? op.eq(schema.chiiCharacterSubjects.type, type) : undefined,
        op.ne(schema.chiiSubjects.ban, 1),
        allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
      ),
    )
    .execute();
  const map = new Map<number, res.ICharacterSubjectRelation[]>();
  for (const d of data) {
    const relation = convert.toCharacterSubjectRelation(d.chii_subjects, d.chii_crt_subject_index);
    const list = map.get(d.chii_crt_cast_index.characterID) || [];
    list.push(relation);
    map.set(d.chii_crt_cast_index.characterID, list);
  }
  return map;
}

export async function fetchSubjectTopicByID(topicID: number): Promise<res.ITopic | null> {
  const data = await db
    .select()
    .from(schema.chiiSubjectTopics)
    .innerJoin(schema.chiiUsers, op.eq(schema.chiiSubjectTopics.uid, schema.chiiUsers.id))
    .where(op.eq(schema.chiiSubjectTopics.id, topicID))
    .execute();
  for (const d of data) {
    return convert.toSubjectTopic(d.chii_subject_topics, d.chii_members);
  }
  return null;
}

export async function fetchSubjectTopicRepliesByTopicID(topicID: number): Promise<res.IReply[]> {
  const data = await db
    .select()
    .from(schema.chiiSubjectPosts)
    .innerJoin(schema.chiiUsers, op.eq(schema.chiiSubjectPosts.uid, schema.chiiUsers.id))
    .where(op.eq(schema.chiiSubjectPosts.mid, topicID))
    .execute();

  const subReplies: Record<number, res.ISubReply[]> = {};
  const topLevelReplies: res.IReply[] = [];
  for (const d of data) {
    const related = d.chii_subject_posts.related;
    if (related == 0) {
      const reply = convert.toSubjectTopicReply(d.chii_subject_posts, d.chii_members);
      topLevelReplies.push(reply);
    } else {
      const subReply = convert.toSubjectTopicSubReply(d.chii_subject_posts, d.chii_members);
      const list = subReplies[related] ?? [];
      list.push(subReply);
      subReplies[related] = list;
    }
  }
  for (const reply of topLevelReplies) {
    reply.replies = subReplies[reply.id] ?? [];
  }
  return topLevelReplies;
}

/** 优先从缓存中获取时间线数据，如果缓存中没有则从数据库中获取， 并将获取到的数据缓存到 Redis 中。 */
export async function fetchTimelineByIDs(ids: number[]): Promise<Record<number, res.ITimeline>> {
  const cached = await redis.mget(ids.map((id) => getTimelineItemCacheKey(id)));
  const result: Record<number, res.ITimeline> = {};
  const uids = new Set<number>();
  const missing = [];
  for (const tid of ids) {
    if (cached[tid]) {
      const item = JSON.parse(cached[tid]) as res.ITimeline;
      uids.add(item.uid);
      result[tid] = item;
    } else {
      missing.push(tid);
    }
  }
  if (missing.length > 0) {
    const data = await db
      .select()
      .from(schema.chiiTimeline)
      .where(op.inArray(schema.chiiTimeline.id, missing))
      .execute();
    for (const d of data) {
      const item = convert.toTimeline(d);
      uids.add(item.uid);
      result[d.id] = item;
      await redis.setex(getTimelineItemCacheKey(d.id), 604800, JSON.stringify(item));
    }
  }
  return result;
}
