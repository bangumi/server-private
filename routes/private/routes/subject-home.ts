import t from 'typebox';

import { db, op, type orm, schema } from '@app/drizzle';
import type { IAuth } from '@app/lib/auth/index.ts';
import { NotFoundError } from '@app/lib/error.ts';
import { IndexRelatedCategory } from '@app/lib/index/types';
import { LikeType, Reaction } from '@app/lib/like';
import { logger } from '@app/lib/logger.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { getEpStatus } from '@app/lib/subject/ep';
import { CollectionPrivacy } from '@app/lib/subject/type.ts';
import { TopicDisplay } from '@app/lib/topic/type.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

export const SubjectHomeResponse = t.Object(
  {
    subject: res.Ref(res.Subject),
    episodes: t.Array(res.Ref(res.Episode)),
    characters: t.Array(res.Ref(res.SubjectCharacter)),
    staff: t.Array(res.Ref(res.SubjectStaff)),
    relations: t.Array(res.Ref(res.SubjectRelation)),
    recs: t.Array(res.Ref(res.SubjectRec)),
    comments: t.Array(res.Ref(res.SubjectInterestComment)),
    reviews: t.Array(res.Ref(res.SubjectReview)),
    indexes: t.Array(res.Ref(res.SlimIndex)),
    topics: t.Array(res.Ref(res.Topic)),
  },
  { $id: 'SubjectHomeResponse', title: 'SubjectHomeResponse' },
);

function toSubjectRelation(
  subject: orm.ISubject,
  fields: orm.ISubjectFields,
  relation: orm.ISubjectRelation,
): res.ISubjectRelation {
  return {
    subject: convert.toSlimSubject(subject, fields),
    relation: convert.toSubjectRelationType(relation),
    order: relation.order,
  };
}

function toSubjectCharacter(
  character: orm.ICharacter,
  relation: orm.ICharacterSubject,
  casts: res.ICharacterCast[],
): res.ISubjectCharacter {
  return {
    character: convert.toSlimCharacter(character),
    casts: casts,
    type: relation.type,
    order: relation.order,
  };
}

function toSubjectRec(
  subject: orm.ISubject,
  fields: orm.ISubjectFields,
  rec: orm.ISubjectRec,
): res.ISubjectRec {
  return {
    subject: convert.toSlimSubject(subject, fields),
    sim: rec.sim,
    count: rec.count,
  };
}

async function fetchSubject(auth: Readonly<IAuth>, subjectID: number): Promise<res.ISubject> {
  const subject = await fetcher.fetchSubjectByID(subjectID, auth.allowNsfw);
  if (!subject) {
    throw new NotFoundError(`subject ${subjectID}`);
  }
  if (auth.login) {
    const interest = await fetcher.fetchSubjectInterest(auth.userID, subjectID);
    subject.interest = interest;
  }
  return subject;
}

async function fetchEpisodes(auth: Readonly<IAuth>, subjectID: number): Promise<res.IEpisode[]> {
  const data = await db
    .select()
    .from(schema.chiiEpisodes)
    .where(
      op.and(op.eq(schema.chiiEpisodes.subjectID, subjectID), op.ne(schema.chiiEpisodes.ban, 1)),
    )
    .orderBy(
      op.asc(schema.chiiEpisodes.disc),
      op.asc(schema.chiiEpisodes.type),
      op.asc(schema.chiiEpisodes.sort),
    )
    .limit(100);
  const episodes = data.map((d) => convert.toEpisode(d));
  if (auth.login) {
    const epStatus = await getEpStatus(auth.userID, subjectID);
    for (const ep of episodes) {
      const status = epStatus.get(ep.id);
      if (status?.type) {
        ep.collection = {
          status: status.type,
          updatedAt: status.updated_at?.[status.type],
        };
      }
    }
  }
  return episodes;
}

async function fetchCharacters(
  auth: Readonly<IAuth>,
  subjectID: number,
): Promise<res.ISubjectCharacter[]> {
  const data = await db
    .select()
    .from(schema.chiiCharacterSubjects)
    .innerJoin(
      schema.chiiCharacters,
      op.eq(schema.chiiCharacterSubjects.characterID, schema.chiiCharacters.id),
    )
    .where(
      op.and(
        op.eq(schema.chiiCharacterSubjects.subjectID, subjectID),
        op.ne(schema.chiiCharacters.ban, 1),
        auth.allowNsfw ? undefined : op.eq(schema.chiiCharacters.nsfw, false),
      ),
    )
    .orderBy(op.asc(schema.chiiCharacterSubjects.type), op.asc(schema.chiiCharacterSubjects.order))
    .limit(100);
  const characterIDs = data.map((d) => d.chii_characters.id);
  const casts = await fetcher.fetchCastsBySubjectAndCharacterIDs(
    subjectID,
    characterIDs,
    auth.allowNsfw,
  );
  return data.map((d) =>
    toSubjectCharacter(
      d.chii_characters,
      d.chii_crt_subject_index,
      casts[d.chii_characters.id] || [],
    ),
  );
}

async function fetchStaff(auth: Readonly<IAuth>, subjectID: number): Promise<res.ISubjectStaff[]> {
  const data = await db
    .select({ personID: schema.chiiPersonSubjects.personID })
    .from(schema.chiiPersonSubjects)
    .where(op.eq(schema.chiiPersonSubjects.subjectID, subjectID))
    .groupBy(schema.chiiPersonSubjects.personID)
    .orderBy(op.asc(schema.chiiPersonSubjects.position))
    .limit(100);

  const personIDs = data.map((d) => d.personID);
  const persons = await fetcher.fetchSlimPersonsByIDs(personIDs, auth.allowNsfw);

  const relationsData = await db
    .select()
    .from(schema.chiiPersonSubjects)
    .where(
      op.and(
        op.eq(schema.chiiPersonSubjects.subjectID, subjectID),
        op.inArray(schema.chiiPersonSubjects.personID, personIDs),
      ),
    );
  const relations: Record<number, res.ISubjectStaffPosition[]> = {};
  for (const r of relationsData) {
    const positions = relations[r.personID] || [];
    positions.push({
      type: convert.toSubjectStaffPositionType(r.subjectType, r.position),
      appearEps: r.appearEps,
      summary: r.summary,
    });
    relations[r.personID] = positions;
  }

  const result: res.ISubjectStaff[] = [];
  for (const pid of personIDs) {
    const staff = persons[pid];
    if (staff) {
      result.push({
        staff: staff,
        positions: relations[pid] || [],
      });
    }
  }
  return result;
}

const relationTypeOffprint = 1003;

async function fetchRelations(
  auth: Readonly<IAuth>,
  subjectID: number,
): Promise<res.ISubjectRelation[]> {
  const data = await db
    .select()
    .from(schema.chiiSubjectRelations)
    .innerJoin(
      schema.chiiSubjects,
      op.eq(schema.chiiSubjectRelations.relatedID, schema.chiiSubjects.id),
    )
    .innerJoin(schema.chiiSubjectFields, op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id))
    .where(
      op.and(
        op.eq(schema.chiiSubjectRelations.id, subjectID),
        op.ne(schema.chiiSubjectRelations.relation, relationTypeOffprint),
        op.ne(schema.chiiSubjects.ban, 1),
        auth.allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
      ),
    )
    .orderBy(
      op.asc(schema.chiiSubjectRelations.relation),
      op.asc(schema.chiiSubjectRelations.order),
    )
    .limit(100);
  return data.map((d) =>
    toSubjectRelation(d.chii_subjects, d.chii_subject_fields, d.chii_subject_relations),
  );
}

async function fetchRecs(auth: Readonly<IAuth>, subjectID: number): Promise<res.ISubjectRec[]> {
  const data = await db
    .select()
    .from(schema.chiiSubjectRec)
    .innerJoin(
      schema.chiiSubjects,
      op.eq(schema.chiiSubjectRec.recSubjectID, schema.chiiSubjects.id),
    )
    .innerJoin(schema.chiiSubjectFields, op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id))
    .where(
      op.and(
        op.eq(schema.chiiSubjectRec.subjectID, subjectID),
        op.ne(schema.chiiSubjects.ban, 1),
        auth.allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
      ),
    )
    .orderBy(op.asc(schema.chiiSubjectRec.count))
    .limit(10);
  return data.map((d) => toSubjectRec(d.chii_subjects, d.chii_subject_fields, d.chii_subject_rec));
}

async function fetchComments(
  _auth: Readonly<IAuth>,
  subjectID: number,
): Promise<res.ISubjectInterestComment[]> {
  const condition = op.and(
    op.eq(schema.chiiSubjectInterests.subjectID, subjectID),
    op.eq(schema.chiiSubjectInterests.privacy, CollectionPrivacy.Public),
    op.eq(schema.chiiSubjectInterests.hasComment, 1),
    op.ne(schema.chiiSubjectInterests.type, 0),
  );
  const data = await db
    .select()
    .from(schema.chiiSubjectInterests)
    .where(condition)
    .orderBy(op.desc(schema.chiiSubjectInterests.updatedAt))
    .limit(10);
  const uids = data.map((d) => d.uid);
  const users = await fetcher.fetchSlimUsersByIDs(uids);
  const collectIDs = data.map((d) => d.id);
  const reactions = await Reaction.fetchByRelatedIDs(LikeType.SubjectCollect, collectIDs);
  const comments: res.ISubjectInterestComment[] = [];
  for (const d of data) {
    const user = users[d.uid];
    if (!user) {
      continue;
    }
    comments.push({
      id: d.id,
      user,
      type: d.type,
      rate: d.rate,
      comment: d.comment,
      reactions: reactions[d.id],
      updatedAt: d.updatedAt,
    });
  }
  return comments;
}

async function fetchReviews(
  _auth: Readonly<IAuth>,
  subjectID: number,
): Promise<res.ISubjectReview[]> {
  const data = await db
    .select()
    .from(schema.chiiSubjectRelatedBlogs)
    .innerJoin(
      schema.chiiBlogEntries,
      op.eq(schema.chiiSubjectRelatedBlogs.entryID, schema.chiiBlogEntries.id),
    )
    .where(
      op.and(
        op.eq(schema.chiiSubjectRelatedBlogs.subjectID, subjectID),
        op.eq(schema.chiiBlogEntries.public, true),
      ),
    )
    .orderBy(op.desc(schema.chiiBlogEntries.createdAt))
    .limit(5);
  const uids = data.map((d) => d.chii_subject_related_blog.uid);
  const users = await fetcher.fetchSlimUsersByIDs(uids);
  const reviews: res.ISubjectReview[] = [];
  for (const d of data) {
    const user = users[d.chii_subject_related_blog.uid];
    if (!user) {
      continue;
    }
    reviews.push({
      id: d.chii_subject_related_blog.id,
      user,
      entry: convert.toSlimBlogEntry(d.chii_blog_entry),
    });
  }
  return reviews;
}

async function fetchIndexes(auth: Readonly<IAuth>, subjectID: number): Promise<res.ISlimIndex[]> {
  const data = await db
    .select({ indexID: schema.chiiIndexRelated.rid })
    .from(schema.chiiIndexRelated)
    .where(
      op.and(
        op.eq(schema.chiiIndexRelated.sid, subjectID),
        op.eq(schema.chiiIndexRelated.ban, 0),
        op.eq(schema.chiiIndexRelated.cat, IndexRelatedCategory.Subject),
      ),
    )
    .groupBy(schema.chiiIndexRelated.rid)
    .orderBy(op.desc(op.max(schema.chiiIndexRelated.id)))
    .limit(10);
  const indexIDs = data.map((d) => d.indexID);
  const fetched = await fetcher.fetchSlimIndexesByIDs(indexIDs);
  const uids = Object.values(fetched).map((index) => index.uid);
  const users = await fetcher.fetchSlimUsersByIDs(uids);
  const indexes: res.ISlimIndex[] = [];
  for (const indexID of indexIDs) {
    const index = fetched[indexID];
    if (!index) {
      continue;
    }
    if (index.private && index.uid !== auth.userID) {
      continue;
    }
    index.user = users[index.uid];
    indexes.push(index);
  }
  return indexes;
}

async function fetchTopics(auth: Readonly<IAuth>, subjectID: number): Promise<res.ITopic[]> {
  const conditions = [op.eq(schema.chiiSubjectTopics.subjectID, subjectID)];
  if (!auth.permission.manage_topic_state) {
    conditions.push(op.eq(schema.chiiSubjectTopics.display, TopicDisplay.Normal));
  }
  const data = await db
    .select()
    .from(schema.chiiSubjectTopics)
    .innerJoin(schema.chiiUsers, op.eq(schema.chiiSubjectTopics.uid, schema.chiiUsers.id))
    .where(op.and(...conditions))
    .orderBy(op.desc(schema.chiiSubjectTopics.updatedAt))
    .limit(5);
  const topics = data.map((d) => convert.toSubjectTopic(d.chii_subject_topics));
  const uids = topics.map((t) => t.creatorID);
  const users = await fetcher.fetchSlimUsersByIDs(uids);
  for (const topic of topics) {
    topic.creator = users[topic.creatorID];
  }
  return topics;
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(SubjectHomeResponse);

  app.get(
    '/subjects/:subjectID/home',
    {
      schema: {
        summary: '获取条目首页数据',
        description:
          '聚合条目详情页所需的全部数据：条目信息、章节、角色、制作人员、相关条目、推荐、吐槽、相关日志、收录与讨论。' +
          '已登录时返回个人收藏状态与章节观看状态。各个区块独立计算，单个区块失败时返回空数据，不影响其他区块。',
        operationId: 'getSubjectHome',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        response: {
          200: res.Ref(SubjectHomeResponse),
        },
      },
    },
    async ({ auth, params: { subjectID } }) => {
      const subject = await fetchSubject(auth, subjectID);
      const [episodes, characters, staff, relations, recs, comments, reviews, indexes, topics] =
        await Promise.all([
          fetchEpisodes(auth, subjectID).catch((error) => {
            logger.error(error, 'failed to fetch subject home episodes');
            return [] as res.IEpisode[];
          }),
          fetchCharacters(auth, subjectID).catch((error) => {
            logger.error(error, 'failed to fetch subject home characters');
            return [] as res.ISubjectCharacter[];
          }),
          fetchStaff(auth, subjectID).catch((error) => {
            logger.error(error, 'failed to fetch subject home staff');
            return [] as res.ISubjectStaff[];
          }),
          fetchRelations(auth, subjectID).catch((error) => {
            logger.error(error, 'failed to fetch subject home relations');
            return [] as res.ISubjectRelation[];
          }),
          fetchRecs(auth, subjectID).catch((error) => {
            logger.error(error, 'failed to fetch subject home recs');
            return [] as res.ISubjectRec[];
          }),
          fetchComments(auth, subjectID).catch((error) => {
            logger.error(error, 'failed to fetch subject home comments');
            return [] as res.ISubjectInterestComment[];
          }),
          fetchReviews(auth, subjectID).catch((error) => {
            logger.error(error, 'failed to fetch subject home reviews');
            return [] as res.ISubjectReview[];
          }),
          fetchIndexes(auth, subjectID).catch((error) => {
            logger.error(error, 'failed to fetch subject home indexes');
            return [] as res.ISlimIndex[];
          }),
          fetchTopics(auth, subjectID).catch((error) => {
            logger.error(error, 'failed to fetch subject home topics');
            return [] as res.ITopic[];
          }),
        ]);

      return {
        subject,
        episodes,
        characters,
        staff,
        relations,
        recs,
        comments,
        reviews,
        indexes,
        topics,
      };
    },
  );
}
