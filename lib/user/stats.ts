import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema.ts';
import redis from '@app/lib/redis';
import { CollectionPrivacy, CollectionType, SubjectType } from '@app/lib/subject/type.ts';
import type * as res from '@app/lib/types/res.ts';

import { getStatsCacheKey } from './cache.ts';

/** Cached */
export async function countUserBlog(uid: number): Promise<number> {
  const key = getStatsCacheKey(uid, 'blog');
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as number;
  }
  const [{ count = 0 } = {}] = await db
    .select({ count: op.count() })
    .from(schema.chiiBlogEntries)
    .where(
      op.and(op.eq(schema.chiiBlogEntries.uid, uid), op.eq(schema.chiiBlogEntries.public, true)),
    );
  await redis.setex(key, 3600, count);
  return count;
}

/** Cached */
export async function countUserFriend(uid: number): Promise<number> {
  const key = getStatsCacheKey(uid, 'friend');
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as number;
  }
  const [{ count = 0 } = {}] = await db
    .select({ count: op.count() })
    .from(schema.chiiFriends)
    .where(op.eq(schema.chiiFriends.uid, uid));
  await redis.setex(key, 3600, count);
  return count;
}

/** Cached */
export async function countUserGroup(uid: number): Promise<number> {
  const key = getStatsCacheKey(uid, 'group');
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as number;
  }
  const [{ count = 0 } = {}] = await db
    .select({ count: op.count() })
    .from(schema.chiiGroupMembers)
    .where(op.eq(schema.chiiGroupMembers.uid, uid));
  await redis.setex(key, 3600, count);
  return count;
}

/** Cached */
export async function countUserIndex(uid: number): Promise<res.IUserIndexStats> {
  const key = getStatsCacheKey(uid, 'index');
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as res.IUserIndexStats;
  }
  const [{ create = 0 } = {}] = await db
    .select({ create: op.count() })
    .from(schema.chiiIndexes)
    .where(op.and(op.eq(schema.chiiIndexes.uid, uid), op.eq(schema.chiiIndexes.ban, 0)));
  const [{ collect = 0 } = {}] = await db
    .select({ collect: op.count() })
    .from(schema.chiiIndexCollects)
    .where(op.eq(schema.chiiIndexCollects.uid, uid));
  const stats = { create, collect };
  await redis.setex(key, 3600, JSON.stringify(stats));
  return stats;
}

/** Cached */
export async function countUserMonoCollection(uid: number): Promise<res.IUserMonoCollectionStats> {
  const key = getStatsCacheKey(uid, 'mono');
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as res.IUserMonoCollectionStats;
  }
  const data = await db
    .select({ cat: schema.chiiPersonCollects.cat, count: op.count() })
    .from(schema.chiiPersonCollects)
    .where(op.eq(schema.chiiPersonCollects.uid, uid))
    .groupBy(schema.chiiPersonCollects.cat);
  const stats = { person: 0, character: 0 };
  for (const d of data) {
    switch (d.cat) {
      case 'crt': {
        stats.character = d.count;
        break;
      }
      case 'prsn': {
        stats.person = d.count;
        break;
      }
    }
  }
  await redis.setex(key, 3600, JSON.stringify(stats));
  return stats;
}

/** Cached */
export async function countUserSubjectCollection(
  uid: number,
): Promise<Record<number, Record<number, number>>> {
  const key = getStatsCacheKey(uid, 'subject');
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as res.IUserSubjectCollectionStats;
  }
  const data = await db
    .select({
      stype: schema.chiiSubjectInterests.subjectType,
      ctype: schema.chiiSubjectInterests.type,
      count: op.count(),
    })
    .from(schema.chiiSubjectInterests)
    .where(
      op.and(
        op.eq(schema.chiiSubjectInterests.uid, uid),
        op.eq(schema.chiiSubjectInterests.privacy, CollectionPrivacy.Public),
        op.ne(schema.chiiSubjectInterests.type, 0),
      ),
    )
    .groupBy(schema.chiiSubjectInterests.subjectType, schema.chiiSubjectInterests.type);
  const empty = {
    [CollectionType.Wish]: 0,
    [CollectionType.Collect]: 0,
    [CollectionType.Doing]: 0,
    [CollectionType.OnHold]: 0,
    [CollectionType.Dropped]: 0,
  };
  const stats = {
    [SubjectType.Anime]: Object.assign({}, empty),
    [SubjectType.Book]: Object.assign({}, empty),
    [SubjectType.Music]: Object.assign({}, empty),
    [SubjectType.Game]: Object.assign({}, empty),
    [SubjectType.Real]: Object.assign({}, empty),
  };
  for (const d of data) {
    const type = d.ctype as CollectionType;
    const stype = d.stype as SubjectType;
    stats[stype][type] = d.count;
  }
  await redis.setex(key, 3600, JSON.stringify(stats));
  return stats;
}
