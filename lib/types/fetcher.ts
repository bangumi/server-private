import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import { getSlimCacheKey as getGroupSlimCacheKey } from '@app/lib/group/cache.ts';
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
import { getSubjectTrendingKey } from '@app/lib/trending/subject.ts';
import { type TrendingItem, TrendingPeriod } from '@app/lib/trending/type.ts';
import { getSlimCacheKey as getUserSlimCacheKey } from '@app/lib/user/cache.ts';

import * as convert from './convert.ts';
import type * as res from './res.ts';

const ONE_MONTH = 2592000;

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

export async function fetchSlimUserByID(uid: number): Promise<res.ISlimUser | null> {
  const cached = await redis.get(getUserSlimCacheKey(uid));
  if (cached) {
    const item = JSON.parse(cached) as res.ISlimUser;
    return item;
  }
  const [data] = await db
    .select()
    .from(schema.chiiUsers)
    .where(op.eq(schema.chiiUsers.id, uid))
    .execute();
  if (!data) {
    return null;
  }
  const item = convert.toSlimUser(data);
  await redis.setex(getUserSlimCacheKey(uid), ONE_MONTH, JSON.stringify(item));
  return item;
}

export async function fetchSlimUsersByIDs(ids: number[]): Promise<Record<number, res.ISlimUser>> {
  const cached = await redis.mget(ids.map((id) => getUserSlimCacheKey(id)));
  const result: Record<number, res.ISlimUser> = {};
  const missing = [];
  for (const id of ids) {
    if (cached[id]) {
      result[id] = JSON.parse(cached[id]) as res.ISlimUser;
    } else {
      missing.push(id);
    }
  }
  const data = await db
    .select()
    .from(schema.chiiUsers)
    .where(op.inArray(schema.chiiUsers.id, missing))
    .execute();
  for (const d of data) {
    await redis.setex(getUserSlimCacheKey(d.id), ONE_MONTH, JSON.stringify(convert.toSlimUser(d)));
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
  await redis.setex(getSubjectSlimCacheKey(id), ONE_MONTH, JSON.stringify(slim));
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
      await redis.setex(getSubjectSlimCacheKey(d.id), ONE_MONTH, JSON.stringify(slim));
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
  await redis.setex(getSubjectItemCacheKey(id), ONE_MONTH, JSON.stringify(item));
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
      await redis.setex(getSubjectItemCacheKey(item.id), ONE_MONTH, JSON.stringify(item));
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
): Promise<res.IPaged<number>> {
  const cacheKey = getSubjectListCacheKey(filter, sort, page);
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as res.IPaged<number>;
  }
  if (sort === SubjectSort.Trends) {
    const trendingKey = getSubjectTrendingKey(filter.type, TrendingPeriod.Month);
    const data = await redis.get(trendingKey);
    if (!data) {
      return { data: [], total: 0 };
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
  const [{ count = 0 } = {}] = await db
    .select({ count: op.count() })
    .from(schema.chiiSubjects)
    .innerJoin(schema.chiiSubjectFields, op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id))
    .where(op.and(...conditions))
    .execute();
  if (count === 0) {
    return { data: [], total: 0 };
  }
  const total = Math.ceil(count / 24);

  const query = db
    .select({ id: schema.chiiSubjects.id })
    .from(schema.chiiSubjects)
    .innerJoin(schema.chiiSubjectFields, op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id))
    .where(op.and(...conditions));
  if (sort === SubjectSort.Trends) {
    if (!filter.ids) {
      return { data: [], total: 0 };
    }
    query.orderBy(op.sql`find_in_set(id, ${filter.ids.join(',')})`);
  } else {
    query.orderBy(...sorts);
  }
  const data = await query
    .limit(24)
    .offset((page - 1) * 24)
    .execute();
  const result = { data: data.map((d) => d.id), total };
  if (page === 1) {
    await redis.setex(cacheKey, 86400, JSON.stringify(result));
  } else {
    await redis.setex(cacheKey, 3600, JSON.stringify(result));
  }
  return result;
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

export async function fetchSlimGroupByID(groupID: number): Promise<res.ISlimGroup | null> {
  const cached = await redis.get(getGroupSlimCacheKey(groupID));
  if (cached) {
    return JSON.parse(cached) as res.ISlimGroup;
  }
  const [data] = await db
    .select()
    .from(schema.chiiGroups)
    .where(op.eq(schema.chiiGroups.id, groupID))
    .execute();
  if (!data) {
    return null;
  }
  const group = convert.toSlimGroup(data);
  await redis.setex(getGroupSlimCacheKey(groupID), ONE_MONTH, JSON.stringify(group));
  return group;
}

export async function fetchSlimGroupsByIDs(ids: number[]): Promise<Record<number, res.ISlimGroup>> {
  const cached = await redis.mget(ids.map((id) => getGroupSlimCacheKey(id)));
  const result: Record<number, res.ISlimGroup> = {};
  const missing = [];
  for (const id of ids) {
    if (cached[id]) {
      result[id] = JSON.parse(cached[id]) as res.ISlimGroup;
    } else {
      missing.push(id);
    }
  }
  if (missing.length > 0) {
    const data = await db
      .select()
      .from(schema.chiiGroups)
      .where(op.inArray(schema.chiiGroups.id, missing))
      .execute();
    for (const d of data) {
      const group = convert.toSlimGroup(d);
      await redis.setex(getGroupSlimCacheKey(d.id), ONE_MONTH, JSON.stringify(group));
      result[d.id] = group;
    }
  }
  return result;
}
