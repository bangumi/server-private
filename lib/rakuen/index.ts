import { db, op, schema } from '@app/drizzle';
import type { IAuth } from '@app/lib/auth/index.ts';
import { TypedCache } from '@app/lib/cache.ts';
import { BadRequestError } from '@app/lib/error';
import { TopicDisplay } from '@app/lib/topic/type.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import { IRaKuenTopicType } from '@app/lib/types/req.ts';
import type * as res from '@app/lib/types/res.ts';
import { fetchJoinedGroups } from '@app/lib/user/utils.ts';

/** 全站 1 分钟缓存，my_group 为登录态数据，key 带 uid */
const cache = TypedCache<string, res.IPaged<res.IRaKuenTopic>>(
  (key) => `rakuen:topics:v1:${key}`,
  60,
);

type RaKuenItem = res.IRaKuenTopic;

interface QueryResult {
  items: RaKuenItem[];
  total: number;
}

async function fetchGroupTopics(
  auth: Readonly<IAuth>,
  limit: number,
  myGroup: boolean,
): Promise<QueryResult> {
  if (myGroup && !auth.login) {
    return { items: [], total: 0 };
  }

  const conditions = [op.eq(schema.chiiGroupTopics.display, TopicDisplay.Normal)];
  if (!auth.allowNsfw) {
    conditions.push(op.eq(schema.chiiGroups.nsfw, false));
  }
  if (myGroup) {
    const gids = await fetchJoinedGroups(auth.userID);
    if (gids.length === 0) {
      return { items: [], total: 0 };
    }
    conditions.push(op.inArray(schema.chiiGroupTopics.gid, gids));
  }

  const join = op.eq(schema.chiiGroupTopics.gid, schema.chiiGroups.id);
  const [{ count = 0 } = {}] = await db
    .select({ count: op.count() })
    .from(schema.chiiGroupTopics)
    .innerJoin(schema.chiiGroups, join)
    .where(op.and(...conditions));
  const data = await db
    .select()
    .from(schema.chiiGroupTopics)
    .innerJoin(schema.chiiGroups, join)
    .where(op.and(...conditions))
    .orderBy(op.desc(schema.chiiGroupTopics.updatedAt))
    .limit(limit);

  const [groups, users] = await Promise.all([
    fetcher.fetchSlimGroupsByIDs(
      data.map((d) => d.chii_group_topics.gid),
      auth.allowNsfw,
    ),
    fetcher.fetchSlimUsersByIDs(data.map((d) => d.chii_group_topics.uid)),
  ]);
  const items: RaKuenItem[] = [];
  for (const d of data) {
    const topic = d.chii_group_topics;
    const group = groups[topic.gid];
    const creator = users[topic.uid];
    if (!group || !creator) {
      continue;
    }
    items.push({
      type: 'group',
      id: topic.id,
      title: topic.title,
      replyCount: topic.replies,
      creator,
      group,
      updatedAt: topic.updatedAt,
    });
  }
  return { items, total: count };
}

async function fetchSubjectTopics(auth: Readonly<IAuth>, limit: number): Promise<QueryResult> {
  const conditions = [op.eq(schema.chiiSubjectTopics.display, TopicDisplay.Normal)];
  if (!auth.allowNsfw) {
    conditions.push(op.eq(schema.chiiSubjects.nsfw, false));
  }
  const join = op.eq(schema.chiiSubjectTopics.subjectID, schema.chiiSubjects.id);
  const [{ count = 0 } = {}] = await db
    .select({ count: op.count() })
    .from(schema.chiiSubjectTopics)
    .innerJoin(schema.chiiSubjects, join)
    .where(op.and(...conditions));
  const data = await db
    .select()
    .from(schema.chiiSubjectTopics)
    .innerJoin(schema.chiiSubjects, join)
    .where(op.and(...conditions))
    .orderBy(op.desc(schema.chiiSubjectTopics.updatedAt))
    .limit(limit);

  const [users, subjects] = await Promise.all([
    fetcher.fetchSlimUsersByIDs(data.map((d) => d.chii_subject_topics.uid)),
    fetcher.fetchSlimSubjectsByIDs(
      data.map((d) => d.chii_subject_topics.subjectID),
      auth.allowNsfw,
    ),
  ]);
  const items: RaKuenItem[] = [];
  for (const d of data) {
    const topic = d.chii_subject_topics;
    const subject = subjects[topic.subjectID];
    const creator = users[topic.uid];
    if (!subject || !creator) {
      continue;
    }
    items.push({
      type: 'subject',
      id: topic.id,
      title: topic.title,
      replyCount: topic.replies,
      creator,
      subject,
      updatedAt: topic.updatedAt,
    });
  }
  return { items, total: count };
}

async function fetchEpisodes(auth: Readonly<IAuth>, limit: number): Promise<QueryResult> {
  const conditions = [op.ne(schema.chiiEpisodes.ban, 1)];
  if (!auth.allowNsfw) {
    conditions.push(op.eq(schema.chiiSubjects.nsfw, false));
  }
  const join = op.eq(schema.chiiEpisodes.subjectID, schema.chiiSubjects.id);
  const [{ count = 0 } = {}] = await db
    .select({ count: op.count() })
    .from(schema.chiiEpisodes)
    .innerJoin(schema.chiiSubjects, join)
    .where(op.and(...conditions));
  const data = await db
    .select()
    .from(schema.chiiEpisodes)
    .innerJoin(schema.chiiSubjects, join)
    .where(op.and(...conditions))
    .orderBy(op.desc(schema.chiiEpisodes.updatedAt))
    .limit(limit);

  const subjects = await fetcher.fetchSlimSubjectsByIDs(
    data.map((d) => d.chii_episodes.subjectID),
    auth.allowNsfw,
  );
  const items: RaKuenItem[] = [];
  for (const d of data) {
    const ep = d.chii_episodes;
    const subject = subjects[ep.subjectID];
    if (!subject) {
      continue;
    }
    items.push({
      type: 'episode',
      id: ep.id,
      subject,
      episode: {
        id: ep.id,
        sort: ep.sort,
        type: ep.type,
        name: ep.name,
        nameCN: ep.nameCN,
        comment: ep.comment,
      },
      updatedAt: ep.updatedAt,
    });
  }
  return { items, total: count };
}

async function fetchCharacters(auth: Readonly<IAuth>, limit: number): Promise<QueryResult> {
  const conditions = [
    op.ne(schema.chiiCharacters.ban, 1),
    op.eq(schema.chiiCharacters.redirect, 0),
  ];
  if (!auth.allowNsfw) {
    conditions.push(op.eq(schema.chiiCharacters.nsfw, false));
  }
  const [{ count = 0 } = {}] = await db
    .select({ count: op.count() })
    .from(schema.chiiCharacters)
    .where(op.and(...conditions));
  const data = await db
    .select({ id: schema.chiiCharacters.id, updatedAt: schema.chiiCharacters.lastPost })
    .from(schema.chiiCharacters)
    .where(op.and(...conditions))
    .orderBy(op.desc(schema.chiiCharacters.lastPost))
    .limit(limit);

  const slims = await fetcher.fetchSlimCharactersByIDs(
    data.map((d) => d.id),
    auth.allowNsfw,
  );
  const items: RaKuenItem[] = [];
  for (const d of data) {
    const c = slims[d.id];
    if (!c) {
      continue;
    }
    items.push({
      type: 'character',
      id: c.id,
      name: c.name,
      nameCN: c.nameCN,
      images: c.images,
      comment: c.comment,
      updatedAt: d.updatedAt,
    });
  }
  return { items, total: count };
}

async function fetchPersons(auth: Readonly<IAuth>, limit: number): Promise<QueryResult> {
  const conditions = [op.ne(schema.chiiPersons.ban, 1), op.eq(schema.chiiPersons.redirect, 0)];
  if (!auth.allowNsfw) {
    conditions.push(op.eq(schema.chiiPersons.nsfw, false));
  }
  const [{ count = 0 } = {}] = await db
    .select({ count: op.count() })
    .from(schema.chiiPersons)
    .where(op.and(...conditions));
  const data = await db
    .select({ id: schema.chiiPersons.id, updatedAt: schema.chiiPersons.lastPost })
    .from(schema.chiiPersons)
    .where(op.and(...conditions))
    .orderBy(op.desc(schema.chiiPersons.lastPost))
    .limit(limit);

  const slims = await fetcher.fetchSlimPersonsByIDs(
    data.map((d) => d.id),
    auth.allowNsfw,
  );
  const items: RaKuenItem[] = [];
  for (const d of data) {
    const p = slims[d.id];
    if (!p) {
      continue;
    }
    items.push({
      type: 'person',
      id: p.id,
      name: p.name,
      nameCN: p.nameCN,
      images: p.images,
      comment: p.comment,
      updatedAt: d.updatedAt,
    });
  }
  return { items, total: count };
}

export async function getRaKuenTopics(
  auth: Readonly<IAuth>,
  type: string,
  limit: number,
): Promise<res.IPaged<res.IRaKuenTopic>> {
  const cacheKey =
    type === IRaKuenTopicType.MyGroup ? `my_group:${auth.userID}:${limit}` : `${type}:${limit}`;

  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let result: res.IPaged<res.IRaKuenTopic>;
  switch (type) {
    case IRaKuenTopicType.All: {
      const [g, s, e, c, p] = await Promise.all([
        fetchGroupTopics(auth, limit, false),
        fetchSubjectTopics(auth, limit),
        fetchEpisodes(auth, limit),
        fetchCharacters(auth, limit),
        fetchPersons(auth, limit),
      ]);
      result = {
        data: [...g.items, ...s.items, ...e.items, ...c.items, ...p.items]
          .toSorted((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, limit),
        total: g.total + s.total + e.total + c.total + p.total,
      };
      break;
    }
    case IRaKuenTopicType.Group: {
      const { items, total } = await fetchGroupTopics(auth, limit, false);
      result = { data: items, total };
      break;
    }
    case IRaKuenTopicType.MyGroup: {
      const { items, total } = await fetchGroupTopics(auth, limit, true);
      result = { data: items, total };
      break;
    }
    case IRaKuenTopicType.Subject: {
      const { items, total } = await fetchSubjectTopics(auth, limit);
      result = { data: items, total };
      break;
    }
    case IRaKuenTopicType.Episode: {
      const { items, total } = await fetchEpisodes(auth, limit);
      result = { data: items, total };
      break;
    }
    case IRaKuenTopicType.Character: {
      const { items, total } = await fetchCharacters(auth, limit);
      result = { data: items, total };
      break;
    }
    case IRaKuenTopicType.Person: {
      const { items, total } = await fetchPersons(auth, limit);
      result = { data: items, total };
      break;
    }
    default: {
      throw new BadRequestError(`invalid rakuen topic type ${type}`);
    }
  }

  await cache.set(cacheKey, result);
  return result;
}
