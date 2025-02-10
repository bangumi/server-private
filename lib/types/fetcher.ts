import * as lo from 'lodash-es';
import { DateTime } from 'luxon';

import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import { getSlimCacheKey as getBlogSlimCacheKey } from '@app/lib/blog/cache.ts';
import { getSlimCacheKey as getCharacterSlimCacheKey } from '@app/lib/character/cache.ts';
import { getSlimCacheKey as getGroupSlimCacheKey } from '@app/lib/group/cache.ts';
import { getSlimCacheKey as getIndexSlimCacheKey } from '@app/lib/index/cache.ts';
import { getSlimCacheKey as getPersonSlimCacheKey } from '@app/lib/person/cache.ts';
import redis from '@app/lib/redis.ts';
import {
  getCalendarCacheKey,
  getEpCacheKey as getSubjectEpCacheKey,
  getItemCacheKey as getSubjectItemCacheKey,
  getListCacheKey as getSubjectListCacheKey,
  getSlimCacheKey as getSubjectSlimCacheKey,
} from '@app/lib/subject/cache.ts';
import {
  type CalendarItem,
  type SubjectFilter,
  SubjectSort,
  SubjectType,
  TagCat,
} from '@app/lib/subject/type.ts';
import { getSubjectTrendingKey } from '@app/lib/trending/subject.ts';
import { type TrendingItem, TrendingPeriod } from '@app/lib/trending/type.ts';
import { getSlimCacheKey as getUserSlimCacheKey } from '@app/lib/user/cache.ts';
import { isFriends } from '@app/lib/user/utils.ts';

import * as convert from './convert.ts';
import type * as res from './res.ts';

const ONE_MONTH = 2592000;

export async function fetchSlimUserByUsername(
  username: string,
): Promise<res.ISlimUser | undefined> {
  const data = await db
    .select()
    .from(schema.chiiUsers)
    .where(op.eq(schema.chiiUsers.username, username));
  for (const d of data) {
    return convert.toSlimUser(d);
  }
  return;
}

/** Cached */
export async function fetchSlimUserByID(uid: number): Promise<res.ISlimUser | undefined> {
  const cached = await redis.get(getUserSlimCacheKey(uid));
  if (cached) {
    const item = JSON.parse(cached) as res.ISlimUser;
    return item;
  }
  const [data] = await db.select().from(schema.chiiUsers).where(op.eq(schema.chiiUsers.id, uid));
  if (!data) {
    return;
  }
  const item = convert.toSlimUser(data);
  await redis.setex(getUserSlimCacheKey(uid), ONE_MONTH, JSON.stringify(item));
  return item;
}

/** Cached */
export async function fetchSlimUsersByIDs(ids: number[]): Promise<Record<number, res.ISlimUser>> {
  if (ids.length === 0) {
    return {};
  }
  ids = lo.uniq(ids);

  const cached = await redis.mget(ids.map((id) => getUserSlimCacheKey(id)));
  const result: Record<number, res.ISlimUser> = {};
  const missing = [];
  for (const [idx, id] of ids.entries()) {
    if (cached[idx]) {
      result[id] = JSON.parse(cached[idx]) as res.ISlimUser;
    } else {
      missing.push(id);
    }
  }
  const data = await db
    .select()
    .from(schema.chiiUsers)
    .where(op.inArray(schema.chiiUsers.id, missing));
  for (const d of data) {
    const slim = convert.toSlimUser(d);
    await redis.setex(getUserSlimCacheKey(slim.id), ONE_MONTH, JSON.stringify(slim));
    result[slim.id] = slim;
  }
  return result;
}

export async function fetchSimpleUsersByIDs(
  ids: number[],
): Promise<Record<number, res.ISimpleUser>> {
  const slims = await fetchSlimUsersByIDs(ids);
  return Object.fromEntries(
    Object.entries(slims).map(([id, slim]) => [
      id,
      {
        id: slim.id,
        username: slim.username,
        nickname: slim.nickname,
      },
    ]),
  );
}

/** Cached */
export async function fetchSlimSubjectByID(
  id: number,
  allowNsfw = false,
): Promise<res.ISlimSubject | undefined> {
  const cached = await redis.get(getSubjectSlimCacheKey(id));
  if (cached) {
    const slim = JSON.parse(cached) as res.ISlimSubject;
    if (!allowNsfw && slim.nsfw) {
      return;
    } else {
      return slim;
    }
  }
  const [data] = await db
    .select()
    .from(schema.chiiSubjects)
    .innerJoin(schema.chiiSubjectFields, op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id))
    .where(op.and(op.eq(schema.chiiSubjects.id, id), op.ne(schema.chiiSubjects.ban, 1)));
  if (!data) {
    return;
  }
  const slim = convert.toSlimSubject(data.chii_subjects, data.chii_subject_fields);
  await redis.setex(getSubjectSlimCacheKey(id), ONE_MONTH, JSON.stringify(slim));
  if (!allowNsfw && slim.nsfw) {
    return;
  }
  return slim;
}

/** Cached */
export async function fetchSlimSubjectsByIDs(
  ids: number[],
  allowNsfw = false,
): Promise<Record<number, res.ISlimSubject>> {
  if (ids.length === 0) {
    return {};
  }
  ids = lo.uniq(ids);
  const cached = await redis.mget(ids.map((id) => getSubjectSlimCacheKey(id)));
  const result: Record<number, res.ISlimSubject> = {};
  const missing = [];
  for (const [idx, id] of ids.entries()) {
    if (cached[idx]) {
      const slim = JSON.parse(cached[idx]) as res.ISlimSubject;
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
      .innerJoin(
        schema.chiiSubjectFields,
        op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id),
      )
      .where(
        op.and(op.inArray(schema.chiiSubjects.id, missing), op.ne(schema.chiiSubjects.ban, 1)),
      );
    for (const d of data) {
      const slim = convert.toSlimSubject(d.chii_subjects, d.chii_subject_fields);
      await redis.setex(
        getSubjectSlimCacheKey(d.chii_subjects.id),
        ONE_MONTH,
        JSON.stringify(slim),
      );
      if (!allowNsfw && slim.nsfw) {
        continue;
      }
      result[d.chii_subjects.id] = slim;
    }
  }
  return result;
}

/** Cached */
export async function fetchSubjectByID(
  id: number,
  allowNsfw = false,
): Promise<res.ISubject | undefined> {
  const cached = await redis.get(getSubjectItemCacheKey(id));
  if (cached) {
    const item = JSON.parse(cached) as res.ISubject;
    if (!allowNsfw && item.nsfw) {
      return;
    }
    return item;
  }
  const [data] = await db
    .select()
    .from(schema.chiiSubjects)
    .innerJoin(schema.chiiSubjectFields, op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id))
    .where(op.and(op.eq(schema.chiiSubjects.id, id), op.ne(schema.chiiSubjects.ban, 1)));
  if (!data) {
    return;
  }
  const item = convert.toSubject(data.chii_subjects, data.chii_subject_fields);
  await redis.setex(getSubjectItemCacheKey(id), ONE_MONTH, JSON.stringify(item));
  if (!allowNsfw && item.nsfw) {
    return;
  }
  return item;
}

/** Cached */
export async function fetchSubjectsByIDs(
  ids: number[],
  allowNsfw = false,
): Promise<Record<number, res.ISubject>> {
  if (ids.length === 0) {
    return {};
  }
  ids = lo.uniq(ids);
  const cached = await redis.mget(ids.map((id) => getSubjectItemCacheKey(id)));
  const result: Record<number, res.ISubject> = {};
  const missing = [];

  for (const [idx, id] of ids.entries()) {
    if (cached[idx]) {
      const item = JSON.parse(cached[idx]) as res.ISubject;
      if (!allowNsfw && item.nsfw) {
        continue;
      }
      result[id] = item;
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
      .where(
        op.and(op.inArray(schema.chiiSubjects.id, missing), op.ne(schema.chiiSubjects.ban, 1)),
      );

    for (const d of data) {
      const item = convert.toSubject(d.chii_subjects, d.chii_subject_fields);
      await redis.setex(getSubjectItemCacheKey(item.id), ONE_MONTH, JSON.stringify(item));
      if (!allowNsfw && item.nsfw) {
        continue;
      }
      result[item.id] = item;
    }
  }
  return result;
}

/** Cached */
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
      );
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
      conditions.push(op.ne(schema.chiiSubjectFields.rank, 0));
      sorts.push(op.asc(schema.chiiSubjectFields.rank));
      break;
    }
    case SubjectSort.Trends: {
      break;
    }
    case SubjectSort.Collects: {
      sorts.push(op.desc(schema.chiiSubjects.collect));
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
    .where(op.and(...conditions));
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
  const data = await query.limit(24).offset((page - 1) * 24);
  const result = { data: data.map((d) => d.id), total };
  if (page === 1) {
    await redis.setex(cacheKey, 86400, JSON.stringify(result));
  } else {
    await redis.setex(cacheKey, 3600, JSON.stringify(result));
  }
  return result;
}

/** Cached */
export async function fetchSubjectOnAirItems(): Promise<CalendarItem[]> {
  const cached = await redis.get(getCalendarCacheKey());
  if (cached) {
    return JSON.parse(cached) as CalendarItem[];
  }

  const now = DateTime.now();
  const seasonSets = {
    1: 1,
    2: 1,
    3: 1,
    4: 4,
    5: 4,
    6: 4,
    7: 7,
    8: 7,
    9: 7,
    10: 10,
    11: 10,
    12: 10,
  };
  const data = await db
    .select({
      id: schema.chiiSubjects.id,
      weekday: schema.chiiSubjectFields.weekday,
      watchers: schema.chiiSubjects.doing,
    })
    .from(schema.chiiSubjects)
    .innerJoin(schema.chiiSubjectFields, op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id))
    .where(
      op.and(
        op.ne(schema.chiiSubjects.ban, 1),
        op.eq(schema.chiiSubjects.typeID, SubjectType.Anime),
        // platform tv+web
        op.inArray(schema.chiiSubjects.platform, [1, 5]),
        op.eq(schema.chiiSubjectFields.year, now.year),
        op.eq(schema.chiiSubjectFields.month, seasonSets[now.month]),
      ),
    );
  const result = [];
  for (const d of data) {
    if (d.weekday < 1 || d.weekday > 7) {
      continue;
    }
    result.push({ id: d.id, weekday: d.weekday, watchers: d.watchers });
  }
  await redis.setex(getCalendarCacheKey(), 86400, JSON.stringify(result));
  return result;
}

export async function fetchSubjectInterest(
  userID: number,
  subjectID: number,
): Promise<res.ISubjectInterest | undefined> {
  const [data] = await db
    .select()
    .from(schema.chiiSubjectInterests)
    .where(
      op.and(
        op.eq(schema.chiiSubjectInterests.uid, userID),
        op.eq(schema.chiiSubjectInterests.subjectID, subjectID),
      ),
    )
    .limit(1);
  if (!data) {
    return;
  }
  return convert.toSubjectInterest(data);
}

/** Cached */
export async function fetchSlimEpisodeByID(episodeID: number): Promise<res.IEpisode | undefined> {
  const episode = await fetchEpisodeItemByID(episodeID);
  if (!episode) {
    return;
  }
  episode.desc = undefined;
  return episode;
}

/** Cached */
export async function fetchEpisodeByID(episodeID: number): Promise<res.IEpisode | undefined> {
  const episode = await fetchEpisodeItemByID(episodeID);
  if (!episode) {
    return;
  }
  const subject = await fetchSlimSubjectByID(episode.subjectID);
  if (!subject) {
    return;
  }
  episode.subject = subject;
  return episode;
}

/** Cached */
async function fetchEpisodeItemByID(episodeID: number): Promise<res.IEpisode | undefined> {
  const cached = await redis.get(getSubjectEpCacheKey(episodeID));
  if (cached) {
    return JSON.parse(cached) as res.IEpisode;
  }
  const [data] = await db
    .select()
    .from(schema.chiiEpisodes)
    .where(op.and(op.eq(schema.chiiEpisodes.id, episodeID), op.ne(schema.chiiEpisodes.ban, 1)));
  if (!data) {
    return;
  }
  const item = convert.toEpisode(data);
  await redis.setex(getSubjectEpCacheKey(episodeID), ONE_MONTH, JSON.stringify(item));
  return item;
}

/** Cached */
export async function fetchSlimCharacterByID(
  id: number,
  allowNsfw = false,
): Promise<res.ISlimCharacter | undefined> {
  const cached = await redis.get(getCharacterSlimCacheKey(id));
  if (cached) {
    const slim = JSON.parse(cached) as res.ISlimCharacter;
    if (!allowNsfw && slim.nsfw) {
      return;
    }
    return slim;
  }
  const [data] = await db
    .select()
    .from(schema.chiiCharacters)
    .where(op.and(op.eq(schema.chiiCharacters.id, id), op.ne(schema.chiiCharacters.ban, 1)));
  if (!data) {
    return;
  }
  const slim = convert.toSlimCharacter(data);
  await redis.setex(getCharacterSlimCacheKey(id), ONE_MONTH, JSON.stringify(slim));
  if (!allowNsfw && slim.nsfw) {
    return;
  }
  return slim;
}

/** Cached */
export async function fetchSlimCharactersByIDs(
  ids: number[],
  allowNsfw = false,
): Promise<Record<number, res.ISlimCharacter>> {
  if (ids.length === 0) {
    return {};
  }
  ids = lo.uniq(ids);
  const cached = await redis.mget(ids.map((id) => getCharacterSlimCacheKey(id)));
  const result: Record<number, res.ISlimCharacter> = {};
  const missing = [];
  for (const [idx, id] of ids.entries()) {
    if (cached[idx]) {
      const slim = JSON.parse(cached[idx]) as res.ISlimCharacter;
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
      .from(schema.chiiCharacters)
      .where(op.inArray(schema.chiiCharacters.id, missing));
    for (const d of data) {
      const slim = convert.toSlimCharacter(d);
      await redis.setex(getCharacterSlimCacheKey(d.id), ONE_MONTH, JSON.stringify(slim));
      if (!allowNsfw && slim.nsfw) {
        continue;
      }
      result[d.id] = slim;
    }
  }
  return result;
}

/** Cached */
export async function fetchSlimPersonByID(
  id: number,
  allowNsfw = false,
): Promise<res.ISlimPerson | undefined> {
  const cached = await redis.get(getPersonSlimCacheKey(id));
  if (cached) {
    const slim = JSON.parse(cached) as res.ISlimPerson;
    if (!allowNsfw && slim.nsfw) {
      return;
    }
    return slim;
  }
  const [data] = await db
    .select()
    .from(schema.chiiPersons)
    .where(op.and(op.eq(schema.chiiPersons.id, id), op.ne(schema.chiiPersons.ban, 1)));
  if (!data) {
    return;
  }
  const slim = convert.toSlimPerson(data);
  await redis.setex(getPersonSlimCacheKey(id), ONE_MONTH, JSON.stringify(slim));
  if (!allowNsfw && slim.nsfw) {
    return;
  }
  return slim;
}

/** Cached */
export async function fetchSlimPersonsByIDs(
  ids: number[],
  allowNsfw = false,
): Promise<Record<number, res.ISlimPerson>> {
  if (ids.length === 0) {
    return {};
  }
  ids = lo.uniq(ids);
  const cached = await redis.mget(ids.map((id) => getPersonSlimCacheKey(id)));
  const result: Record<number, res.ISlimPerson> = {};
  const missing = [];
  for (const [idx, id] of ids.entries()) {
    if (cached[idx]) {
      const slim = JSON.parse(cached[idx]) as res.ISlimPerson;
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
      .from(schema.chiiPersons)
      .where(op.and(op.inArray(schema.chiiPersons.id, missing), op.ne(schema.chiiPersons.ban, 1)));
    for (const d of data) {
      const slim = convert.toSlimPerson(d);
      await redis.setex(getPersonSlimCacheKey(d.id), ONE_MONTH, JSON.stringify(slim));
      if (!allowNsfw && slim.nsfw) {
        continue;
      }
      result[d.id] = slim;
    }
  }
  return result;
}

export async function fetchCastsBySubjectAndCharacterIDs(
  subjectID: number,
  characterIDs: number[],
  allowNsfw: boolean,
): Promise<Record<number, res.ISlimPerson[]>> {
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
    );
  const result: Record<number, res.ISlimPerson[]> = {};
  for (const d of data) {
    const person = convert.toSlimPerson(d.chii_persons);
    const list = result[d.chii_crt_cast_index.characterID] || [];
    list.push(person);
    result[d.chii_crt_cast_index.characterID] = list;
  }
  return result;
}

export async function fetchCastsByCharacterAndSubjectIDs(
  characterID: number,
  subjectIDs: number[],
  allowNsfw: boolean,
): Promise<Record<number, res.ISlimPerson[]>> {
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
    );
  const result: Record<number, res.ISlimPerson[]> = {};
  for (const d of data) {
    const person = convert.toSlimPerson(d.chii_persons);
    const list = result[d.chii_crt_cast_index.subjectID] || [];
    list.push(person);
    result[d.chii_crt_cast_index.subjectID] = list;
  }
  return result;
}

export async function fetchCastsByPersonAndCharacterIDs(
  personID: number,
  characterIDs: number[],
  subjectType: number | undefined,
  type: number | undefined,
  allowNsfw: boolean,
): Promise<Record<number, res.ICharacterSubjectRelation[]>> {
  const data = await db
    .select()
    .from(schema.chiiCharacterCasts)
    .innerJoin(
      schema.chiiSubjects,
      op.and(op.eq(schema.chiiCharacterCasts.subjectID, schema.chiiSubjects.id)),
    )
    .innerJoin(
      schema.chiiSubjectFields,
      op.and(op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id)),
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
    );
  const result: Record<number, res.ICharacterSubjectRelation[]> = {};
  for (const d of data) {
    const relation = convert.toCharacterSubjectRelation(
      d.chii_subjects,
      d.chii_subject_fields,
      d.chii_crt_subject_index,
    );
    const list = result[d.chii_crt_cast_index.characterID] || [];
    list.push(relation);
    result[d.chii_crt_cast_index.characterID] = list;
  }
  return result;
}

/** Cached */
export async function fetchSlimIndexByID(indexID: number): Promise<res.ISlimIndex | undefined> {
  const cached = await redis.get(getIndexSlimCacheKey(indexID));
  if (cached) {
    return JSON.parse(cached) as res.ISlimIndex;
  }
  const [data] = await db
    .select()
    .from(schema.chiiIndexes)
    .where(op.and(op.eq(schema.chiiIndexes.id, indexID), op.ne(schema.chiiIndexes.ban, 1)));
  if (!data) {
    return;
  }
  const item = convert.toSlimIndex(data);
  await redis.setex(getIndexSlimCacheKey(indexID), ONE_MONTH, JSON.stringify(item));
  return item;
}

export async function fetchSlimGroupByName(
  groupName: string,
  allowNsfw = false,
): Promise<res.ISlimGroup | undefined> {
  const [data] = await db
    .select()
    .from(schema.chiiGroups)
    .where(
      op.and(
        op.eq(schema.chiiGroups.name, groupName),
        allowNsfw ? undefined : op.eq(schema.chiiGroups.nsfw, false),
      ),
    )
    .limit(1);
  if (!data) {
    return;
  }
  return convert.toSlimGroup(data);
}

/** Cached */
export async function fetchSlimGroupByID(
  groupID: number,
  allowNsfw = false,
): Promise<res.ISlimGroup | undefined> {
  const cached = await redis.get(getGroupSlimCacheKey(groupID));
  if (cached) {
    const slim = JSON.parse(cached) as res.ISlimGroup;
    if (!allowNsfw && slim.nsfw) {
      return;
    }
    return slim;
  }
  const [data] = await db
    .select()
    .from(schema.chiiGroups)
    .where(op.eq(schema.chiiGroups.id, groupID));
  if (!data) {
    return;
  }
  const slim = convert.toSlimGroup(data);
  await redis.setex(getGroupSlimCacheKey(groupID), ONE_MONTH, JSON.stringify(slim));
  if (!allowNsfw && slim.nsfw) {
    return;
  }
  return slim;
}

/** Cached */
export async function fetchSlimGroupsByIDs(
  ids: number[],
  allowNsfw = false,
): Promise<Record<number, res.ISlimGroup>> {
  if (ids.length === 0) {
    return {};
  }
  ids = lo.uniq(ids);
  const cached = await redis.mget(ids.map((id) => getGroupSlimCacheKey(id)));
  const result: Record<number, res.ISlimGroup> = {};
  const missing = [];
  for (const [idx, id] of ids.entries()) {
    if (cached[idx]) {
      const slim = JSON.parse(cached[idx]) as res.ISlimGroup;
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
      .from(schema.chiiGroups)
      .where(op.inArray(schema.chiiGroups.id, missing));
    for (const d of data) {
      const slim = convert.toSlimGroup(d);
      await redis.setex(getGroupSlimCacheKey(d.id), ONE_MONTH, JSON.stringify(slim));
      if (!allowNsfw && slim.nsfw) {
        continue;
      }
      result[d.id] = slim;
    }
  }
  return result;
}

/** Cached */
export async function fetchSlimBlogEntryByID(
  entryID: number,
  uid: number,
): Promise<res.ISlimBlogEntry | undefined> {
  const cached = await redis.get(getBlogSlimCacheKey(entryID));
  if (cached) {
    const slim = JSON.parse(cached) as res.ISlimBlogEntry;
    const isFriend = await isFriends(slim.uid, uid);
    if (!slim.public && slim.uid !== uid && !isFriend) {
      return;
    }
    return slim;
  }
  const [data] = await db
    .select()
    .from(schema.chiiBlogEntries)
    .where(op.eq(schema.chiiBlogEntries.id, entryID));
  if (!data) {
    return;
  }
  const slim = convert.toSlimBlogEntry(data);
  await redis.setex(getBlogSlimCacheKey(entryID), ONE_MONTH, JSON.stringify(slim));
  const isFriend = await isFriends(slim.uid, uid);
  if (!slim.public && slim.uid !== uid && !isFriend) {
    return;
  }
  return slim;
}
