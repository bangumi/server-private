import { DateTime } from 'luxon';
import t from 'typebox';

import { db, op, type orm, schema } from '@app/drizzle';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { Dam, dam } from '@app/lib/dam.ts';
import { BadRequestError, NotFoundError, UnexpectedNotFoundError } from '@app/lib/error.ts';
import { IndexRelatedCategory } from '@app/lib/index/types';
import { LikeType, Reaction } from '@app/lib/like';
import { NotifyType } from '@app/lib/notify.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { getEpStatus } from '@app/lib/subject/ep';
import type { SubjectFilter, SubjectSort } from '@app/lib/subject/type.ts';
import {
  CollectionPrivacy,
  CollectionType,
  getCollectionTypeField,
} from '@app/lib/subject/type.ts';
import { updateSubjectCollectionCounts, updateSubjectRating } from '@app/lib/subject/utils.ts';
import { AsyncTimelineWriter } from '@app/lib/timeline/writer.ts';
import { CanViewTopicContent } from '@app/lib/topic/display.ts';
import { TopicPostService } from '@app/lib/topic/post.ts';
import { canEditTopic } from '@app/lib/topic/state';
import { CommentState, TopicDisplay } from '@app/lib/topic/type.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { fetchFriends } from '@app/lib/user/utils.ts';
import { LimitAction } from '@app/lib/utils/rate-limit';
import { requireLogin, requireTurnstileToken } from '@app/routes/hooks/pre-handler.ts';
import { rateLimit } from '@app/routes/hooks/rate-limit';
import type { App } from '@app/routes/type.ts';

type SubjectInterestInsert = typeof schema.chiiSubjectInterests.$inferInsert;

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

const subjectPostService = new TopicPostService({
  table: schema.chiiSubjectPosts,
  topicTable: schema.chiiSubjectTopics,
  likeType: LikeType.SubjectReply,
  notifyTypes: {
    topicReply: NotifyType.SubjectTopicReply,
    postReply: NotifyType.SubjectPostReply,
  },
});

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/subjects/:subjectID',
    {
      schema: {
        summary: '获取条目',
        operationId: 'getSubject',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        response: {
          200: res.Ref(res.Subject),
        },
      },
    },
    async ({ auth, params: { subjectID } }) => {
      const [data] = await db
        .select()
        .from(schema.chiiSubjects)
        .innerJoin(
          schema.chiiSubjectFields,
          op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id),
        )
        .where(
          op.and(
            op.eq(schema.chiiSubjects.id, subjectID),
            op.ne(schema.chiiSubjects.ban, 1),
            auth.allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
          ),
        )
        .limit(1);
      if (!data) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      const subject = convert.toSubject(data.chii_subjects, data.chii_subject_fields);
      if (auth.login) {
        const interest = await fetcher.fetchSubjectInterest(auth.userID, subjectID);
        subject.interest = interest;
      }
      return subject;
    },
  );

  app.get(
    '/subjects',
    {
      schema: {
        summary: '获取条目列表',
        operationId: 'getSubjects',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          type: req.Ref(req.SubjectType),
          sort: req.Ref(req.SubjectBrowseSort),
          page: t.Optional(t.Integer({ default: 1, minimum: 1, description: 'min 1' })),
          cat: t.Optional(
            t.Integer({
              description:
                '每种条目类型分类不同，具体参考 https://github.com/bangumi/common 的 subject_platforms.yaml',
            }),
          ),
          series: t.Optional(t.Boolean({ description: '是否为系列，仅对书籍类型的条目有效' })),
          year: t.Optional(t.Integer({ description: '年份' })),
          month: t.Optional(t.Integer({ description: '月份' })),
          tags: t.Optional(
            t.Array(
              t.String({
                description: '标签。默认按 wiki/meta 标签查询，结合 tagsCat 可切换为用户标签。',
              }),
            ),
          ),
          tagsCat: t.Optional(
            t.Union([t.Literal('meta'), t.Literal('subject')], {
              description: 'tags 过滤类别：meta=wiki 标签（默认），subject=用户标签',
            }),
          ),
        }),
        response: {
          200: res.Paged(res.Ref(res.SlimSubject)),
        },
      },
    },
    async ({ auth, query: { type, cat, series, year, month, sort, tags, tagsCat, page = 1 } }) => {
      const filter = {
        type,
        nsfw: auth.allowNsfw,
        cat,
        series,
        year,
        month,
        tags,
        tagsCat,
      } satisfies SubjectFilter;
      const result = await fetcher.fetchSubjectIDsByFilter(filter, sort as SubjectSort, page);
      if (result.data.length === 0) {
        return {
          data: [],
          total: result.total,
        };
      }
      const subjects = await fetcher.fetchSlimSubjectsByIDs(result.data);
      const data = [];
      for (const subjectID of result.data) {
        const subject = subjects[subjectID];
        if (subject) {
          data.push(subject);
        }
      }
      return {
        data,
        total: result.total,
      };
    },
  );

  app.get(
    '/subjects/:subjectID/episodes',
    {
      schema: {
        summary: '获取条目的章节',
        operationId: 'getSubjectEpisodes',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        querystring: t.Object({
          type: t.Optional(req.Ref(req.EpisodeType)),
          limit: t.Optional(
            t.Integer({ default: 100, minimum: 1, maximum: 1000, description: 'max 1000' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.Episode)),
        },
      },
    },
    async ({ auth, params: { subjectID }, query: { type, limit = 100, offset = 0 } }) => {
      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiEpisodes.subjectID, subjectID),
        op.ne(schema.chiiEpisodes.ban, 1),
        type ? op.eq(schema.chiiEpisodes.type, type) : undefined,
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiEpisodes)
        .where(condition);
      const data = await db
        .select()
        .from(schema.chiiEpisodes)
        .where(condition)
        .orderBy(
          op.asc(schema.chiiEpisodes.disc),
          op.asc(schema.chiiEpisodes.type),
          op.asc(schema.chiiEpisodes.sort),
        )
        .limit(limit)
        .offset(offset);
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
      return {
        data: episodes,
        total: count,
      };
    },
  );

  app.get(
    '/subjects/:subjectID/relations',
    {
      schema: {
        summary: '获取条目的关联条目',
        operationId: 'getSubjectRelations',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        querystring: t.Object({
          type: t.Optional(req.Ref(req.SubjectType)),
          offprint: t.Optional(t.Boolean({ default: false, description: '是否单行本' })),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.SubjectRelation)),
        },
      },
    },
    async ({ auth, params: { subjectID }, query: { type, offprint, limit = 20, offset = 0 } }) => {
      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      const relationTypeOffprint = 1003;
      let offprintCondition;
      switch (offprint) {
        case true: {
          offprintCondition = op.eq(schema.chiiSubjectRelations.relation, relationTypeOffprint);
          break;
        }
        case false: {
          offprintCondition = op.ne(schema.chiiSubjectRelations.relation, relationTypeOffprint);
          break;
        }
        case undefined: {
          offprintCondition = undefined;
          break;
        }
      }
      const condition = op.and(
        op.eq(schema.chiiSubjectRelations.id, subjectID),
        type ? op.eq(schema.chiiSubjectRelations.relatedType, type) : undefined,
        offprintCondition,
        op.ne(schema.chiiSubjects.ban, 1),
        auth.allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiSubjectRelations)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiSubjectRelations.relatedID, schema.chiiSubjects.id),
        )
        .where(condition);
      const data = await db
        .select()
        .from(schema.chiiSubjectRelations)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiSubjectRelations.relatedID, schema.chiiSubjects.id),
        )
        .innerJoin(
          schema.chiiSubjectFields,
          op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id),
        )
        .where(condition)
        .orderBy(
          op.asc(schema.chiiSubjectRelations.relation),
          op.asc(schema.chiiSubjectRelations.order),
        )
        .limit(limit)
        .offset(offset);
      const relations = data.map((d) =>
        toSubjectRelation(d.chii_subjects, d.chii_subject_fields, d.chii_subject_relations),
      );
      return {
        data: relations,
        total: count,
      };
    },
  );

  app.get(
    '/subjects/:subjectID/characters',
    {
      schema: {
        summary: '获取条目的角色',
        operationId: 'getSubjectCharacters',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        querystring: t.Object({
          type: t.Optional(t.Integer({ description: '角色出场类型: 主角，配角，客串' })),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.SubjectCharacter)),
        },
      },
    },
    async ({ auth, params: { subjectID }, query: { type, limit = 20, offset = 0 } }) => {
      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiCharacterSubjects.subjectID, subjectID),
        type ? op.eq(schema.chiiCharacterSubjects.type, type) : undefined,
        op.ne(schema.chiiCharacters.ban, 1),
        auth.allowNsfw ? undefined : op.eq(schema.chiiCharacters.nsfw, false),
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiCharacterSubjects)
        .innerJoin(
          schema.chiiCharacters,
          op.eq(schema.chiiCharacterSubjects.characterID, schema.chiiCharacters.id),
        )
        .where(condition);
      const data = await db
        .select()
        .from(schema.chiiCharacterSubjects)
        .innerJoin(
          schema.chiiCharacters,
          op.eq(schema.chiiCharacterSubjects.characterID, schema.chiiCharacters.id),
        )
        .where(condition)
        .orderBy(
          op.asc(schema.chiiCharacterSubjects.type),
          op.asc(schema.chiiCharacterSubjects.order),
        )
        .limit(limit)
        .offset(offset);
      const characterIDs = data.map((d) => d.chii_characters.id);
      const casts = await fetcher.fetchCastsBySubjectAndCharacterIDs(
        subjectID,
        characterIDs,
        auth.allowNsfw,
      );
      const characters = data.map((d) =>
        toSubjectCharacter(
          d.chii_characters,
          d.chii_crt_subject_index,
          casts[d.chii_characters.id] || [],
        ),
      );
      return {
        data: characters,
        total: count,
      };
    },
  );

  app.get(
    '/subjects/:subjectID/staffs/persons',
    {
      schema: {
        summary: '获取条目的制作人员',
        operationId: 'getSubjectStaffPersons',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        querystring: t.Object({
          position: t.Optional(t.Integer({ description: '人物职位: 监督，原案，脚本,..' })),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.SubjectStaff)),
        },
      },
    },
    async ({ auth, params: { subjectID }, query: { position, limit = 20, offset = 0 } }) => {
      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiPersonSubjects.subjectID, subjectID),
        position ? op.eq(schema.chiiPersonSubjects.position, position) : undefined,
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.countDistinct(schema.chiiPersonSubjects.personID) })
        .from(schema.chiiPersonSubjects)
        .where(condition);
      const data = await db
        .select({ personID: schema.chiiPersonSubjects.personID })
        .from(schema.chiiPersonSubjects)
        .where(condition)
        .groupBy(schema.chiiPersonSubjects.personID)
        .orderBy(op.asc(schema.chiiPersonSubjects.position))
        .limit(limit)
        .offset(offset);

      const personIDs = data.map((d) => d.personID);
      const persons = await fetcher.fetchSlimPersonsByIDs(personIDs, auth.allowNsfw);

      const relationsData = await db
        .select()
        .from(schema.chiiPersonSubjects)
        .where(
          op.and(
            op.eq(schema.chiiPersonSubjects.subjectID, subjectID),
            op.inArray(schema.chiiPersonSubjects.personID, personIDs),
            position ? op.eq(schema.chiiPersonSubjects.position, position) : undefined,
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

      const result = [];
      for (const pid of personIDs) {
        const staff = persons[pid];
        if (staff) {
          result.push({
            staff: staff,
            positions: relations[pid] || [],
          });
        }
      }

      return {
        data: result,
        total: count,
      };
    },
  );

  app.get(
    '/subjects/:subjectID/staffs/positions',
    {
      schema: {
        summary: '获取条目的制作人员职位',
        operationId: 'getSubjectStaffPositions',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.SubjectPosition)),
        },
      },
    },
    async ({ auth, params: { subjectID }, query: { limit = 20, offset = 0 } }) => {
      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      const [{ count = 0 } = {}] = await db
        .select({ count: op.countDistinct(schema.chiiPersonSubjects.position) })
        .from(schema.chiiPersonSubjects)
        .where(op.eq(schema.chiiPersonSubjects.subjectID, subjectID));

      const data = await db
        .select({ position: schema.chiiPersonSubjects.position })
        .from(schema.chiiPersonSubjects)
        .where(op.eq(schema.chiiPersonSubjects.subjectID, subjectID))
        .groupBy(schema.chiiPersonSubjects.position)
        .orderBy(op.asc(schema.chiiPersonSubjects.position))
        .limit(limit)
        .offset(offset);
      const positions = data.map((d) =>
        convert.toSubjectStaffPositionType(subject.type, d.position),
      );

      const positionIDs = positions.map((p) => p.id);
      const relationsData = await db
        .select()
        .from(schema.chiiPersonSubjects)
        .where(
          op.and(
            op.eq(schema.chiiPersonSubjects.subjectID, subjectID),
            op.inArray(schema.chiiPersonSubjects.position, positionIDs),
          ),
        )
        .orderBy(op.asc(schema.chiiPersonSubjects.position));
      const personIDs = relationsData.map((d) => d.personID);
      const persons = await fetcher.fetchSlimPersonsByIDs(personIDs, auth.allowNsfw);

      const relations: Record<number, res.ISubjectPositionStaff[]> = {};
      for (const r of relationsData) {
        const staffs = relations[r.position] || [];
        const person = persons[r.personID];
        if (!person) {
          continue;
        }
        staffs.push({
          person: person,
          summary: r.summary,
          appearEps: r.appearEps,
        });
        relations[r.position] = staffs;
      }

      const result: res.ISubjectPosition[] = Array.from(positions, (position) => ({
        position: position,
        staffs: relations[position.id] || [],
      }));

      return {
        data: result,
        total: count,
      };
    },
  );

  app.get(
    '/subjects/:subjectID/recs',
    {
      schema: {
        summary: '获取条目的推荐',
        operationId: 'getSubjectRecs',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 10, minimum: 1, maximum: 10, description: 'max 10' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.SubjectRec)),
        },
      },
    },
    async ({ auth, params: { subjectID }, query: { limit = 10, offset = 0 } }) => {
      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiSubjectRec.subjectID, subjectID),
        op.ne(schema.chiiSubjects.ban, 1),
        auth.allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiSubjectRec)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiSubjectRec.recSubjectID, schema.chiiSubjects.id),
        )
        .where(condition);
      const data = await db
        .select()
        .from(schema.chiiSubjectRec)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiSubjectRec.recSubjectID, schema.chiiSubjects.id),
        )
        .innerJoin(
          schema.chiiSubjectFields,
          op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id),
        )
        .where(condition)
        .orderBy(op.asc(schema.chiiSubjectRec.count))
        .limit(limit)
        .offset(offset);
      const recs = data.map((d) =>
        toSubjectRec(d.chii_subjects, d.chii_subject_fields, d.chii_subject_rec),
      );
      return {
        data: recs,
        total: count,
      };
    },
  );

  app.get(
    '/subjects/:subjectID/comments',
    {
      schema: {
        summary: '获取条目的吐槽箱',
        operationId: 'getSubjectComments',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        querystring: t.Object({
          type: t.Optional(req.Ref(req.CollectionType)),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.SubjectInterestComment)),
        },
      },
    },
    async ({ auth, params: { subjectID }, query: { type, limit = 20, offset = 0 } }) => {
      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiSubjectInterests.subjectID, subjectID),
        op.eq(schema.chiiSubjectInterests.privacy, CollectionPrivacy.Public),
        op.eq(schema.chiiSubjectInterests.hasComment, 1),
        type
          ? op.eq(schema.chiiSubjectInterests.type, type)
          : op.ne(schema.chiiSubjectInterests.type, 0),
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiSubjectInterests)
        .where(condition);
      const data = await db
        .select()
        .from(schema.chiiSubjectInterests)
        .where(condition)
        .orderBy(op.desc(schema.chiiSubjectInterests.updatedAt))
        .limit(limit)
        .offset(offset);
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
        const comment = {
          id: d.id,
          user,
          type: d.type,
          rate: d.rate,
          comment: d.comment,
          reactions: reactions[d.id],
          updatedAt: d.updatedAt,
        };
        comments.push(comment);
      }
      return {
        data: comments,
        total: count,
      };
    },
  );

  app.post(
    '/subjects/:subjectID/comments',
    {
      schema: {
        summary: '发表条目的吐槽',
        description: '吐槽挂在条目收藏上：已收藏则更新吐槽，未收藏需传 type 创建收藏并写吐槽',
        operationId: 'createSubjectComment',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        body: t.Intersect([req.Ref(req.CreateSubjectComment), req.Ref(req.TurnstileToken)]),
        response: {
          200: t.Object({
            id: t.Integer({ description: 'new comment id' }),
          }),
          429: res.Ref(res.Error),
        },
      },
      preHandler: [requireLogin('create subject comment'), requireTurnstileToken()],
    },
    async ({ auth, ip, body, params: { subjectID } }) => {
      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      const type = body.type;
      let rate = body.rate;

      // 对齐 Go UpdateComment：NFC normalize → trim → 不可见字符检查 → 380 长度限制
      const comment = body.comment.normalize('NFC').trim();
      if (comment === '') {
        throw new BadRequestError('comment is required');
      }
      if (!Dam.allCharacterPrintable(comment)) {
        throw new BadRequestError('invisible character are included in comment');
      }
      if ([...comment].length > 380) {
        throw new BadRequestError('comment too long, only allow less equal than 380 characters');
      }
      // 对齐 Go：被禁言用户不允许发表吐槽
      if (auth.permission.ban_post) {
        throw new NotAllowedError('create subject comment');
      }

      await rateLimit(LimitAction.Subject, auth.userID);

      let privacy: number = CollectionPrivacy.Public;
      let commentID = 0;
      const now = DateTime.now().toUnixInteger();
      await db.transaction(async (t) => {
        const [interest] = await t
          .select()
          .from(schema.chiiSubjectInterests)
          .where(
            op.and(
              op.eq(schema.chiiSubjectInterests.uid, auth.userID),
              op.eq(schema.chiiSubjectInterests.subjectID, subjectID),
            ),
          )
          .limit(1);
        if (rate === undefined) {
          rate = 0;
        }
        if (interest) {
          commentID = interest.id;
          privacy = interest.privacy;
          const oldRate = interest.rate;
          const oldType = interest.type;
          const effectiveType = type ?? oldType;
          // 对齐 Go UpdateRate：想看状态时评分强制为 0
          if (effectiveType === CollectionType.Wish) {
            rate = 0;
          }
          const toUpdate: Partial<SubjectInterestInsert> = {
            comment,
            hasComment: 1,
            updatedAt: now,
            updateIp: ip,
          };
          if (type && oldType !== type) {
            toUpdate.type = type;
            toUpdate[`${getCollectionTypeField(type)}Dateline`] = now;
            await updateSubjectCollectionCounts(t, subjectID, type, oldType);
          }
          if (oldRate !== rate) {
            toUpdate.rate = rate;
          }
          if (dam.needReview(comment)) {
            // 对齐 Go ShadowBan：触发敏感词 → 禁止公开
            privacy = CollectionPrivacy.Ban;
            toUpdate.privacy = CollectionPrivacy.Ban;
          } else if (interest.privacy === CollectionPrivacy.Ban) {
            // 对齐 Go ShadowBan 解除：不再触发敏感词时恢复为仅自己可见
            privacy = CollectionPrivacy.Private;
            toUpdate.privacy = CollectionPrivacy.Private;
          }
          await t
            .update(schema.chiiSubjectInterests)
            .set(toUpdate)
            .where(op.eq(schema.chiiSubjectInterests.id, interest.id))
            .limit(1);
          if (oldRate !== rate) {
            await updateSubjectRating(t, subjectID, oldRate, rate);
          }
        } else {
          if (!type) {
            throw new BadRequestError('type is required on new subject comment');
          }
          // 对齐 Go UpdateRate：想看状态时评分强制为 0
          if (type === CollectionType.Wish) {
            rate = 0;
          }
          if (dam.needReview(comment)) {
            privacy = CollectionPrivacy.Ban;
          }
          const field = getCollectionTypeField(type);
          const toInsert: SubjectInterestInsert = {
            uid: auth.userID,
            subjectID,
            subjectType: subject.type,
            rate,
            type,
            hasComment: 1,
            comment,
            tag: '',
            epStatus: 0,
            volStatus: 0,
            wishDateline: 0,
            doingDateline: 0,
            collectDateline: 0,
            onHoldDateline: 0,
            droppedDateline: 0,
            createIp: ip,
            updateIp: ip,
            updatedAt: now,
            privacy,
            [`${field}Dateline`]: now,
          };
          const [result] = await t.insert(schema.chiiSubjectInterests).values(toInsert);
          commentID = result.insertId;
          await updateSubjectCollectionCounts(t, subjectID, type);
          if (rate) {
            await updateSubjectRating(t, subjectID, 0, rate);
          }
        }
      });

      // 对齐 Go mayCreateTimeline：请求带 type 且收藏公开时才写时间线
      if (type !== undefined && privacy === CollectionPrivacy.Public) {
        await AsyncTimelineWriter.subject({
          uid: auth.userID,
          subject: {
            id: subject.id,
            type: subject.type,
          },
          collect: {
            id: commentID,
            type,
            rate: rate ?? 0,
            comment,
          },
          createdAt: now,
          source: auth.source,
        });
      }
      return { id: commentID };
    },
  );

  app.put(
    '/subjects/-/comments/:commentID',
    {
      schema: {
        summary: '编辑条目的吐槽',
        operationId: 'updateSubjectComment',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          commentID: t.Integer({ minimum: 1 }),
        }),
        body: req.Ref(req.UpdateSubjectComment),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('edit a subject comment')],
    },
    async ({ auth, ip, body: { comment }, params: { commentID } }) => {
      const [current] = await db
        .select()
        .from(schema.chiiSubjectInterests)
        .where(op.eq(schema.chiiSubjectInterests.id, commentID))
        .limit(1);
      if (!current || current.hasComment !== 1) {
        throw new NotFoundError(`subject comment ${commentID}`);
      }
      if (current.uid !== auth.userID) {
        throw new NotAllowedError('edit a subject comment which is not yours');
      }
      // 对齐 Go：被禁言用户不允许编辑吐槽
      if (auth.permission.ban_post) {
        throw new NotAllowedError('edit a subject comment');
      }

      // 对齐 Go UpdateComment：NFC normalize → trim → 不可见字符检查 → 380 长度限制
      const normalizedComment = comment.normalize('NFC').trim();
      if (normalizedComment === '') {
        throw new BadRequestError('comment is required');
      }
      if (!Dam.allCharacterPrintable(normalizedComment)) {
        throw new BadRequestError('invisible character are included in comment');
      }
      if ([...normalizedComment].length > 380) {
        throw new BadRequestError('comment too long, only allow less equal than 380 characters');
      }

      await rateLimit(LimitAction.Comment, auth.userID);
      const toUpdate: Partial<SubjectInterestInsert> = {
        comment: normalizedComment,
        updatedAt: DateTime.now().toUnixInteger(),
        updateIp: ip,
      };
      if (dam.needReview(normalizedComment)) {
        // 对齐 Go ShadowBan：触发敏感词 → 禁止公开
        toUpdate.privacy = CollectionPrivacy.Ban;
      } else if (current.privacy === CollectionPrivacy.Ban) {
        // 对齐 Go ShadowBan 解除：不再触发敏感词时恢复为仅自己可见
        toUpdate.privacy = CollectionPrivacy.Private;
      }
      await db
        .update(schema.chiiSubjectInterests)
        .set(toUpdate)
        .where(op.eq(schema.chiiSubjectInterests.id, commentID))
        .limit(1);
      return {};
    },
  );

  app.delete(
    '/subjects/-/comments/:commentID',
    {
      schema: {
        summary: '删除条目的吐槽',
        description: '删除吐槽会清空吐槽内容并保留收藏记录',
        operationId: 'deleteSubjectComment',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          commentID: t.Integer({ minimum: 1 }),
        }),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('delete a subject comment')],
    },
    async ({ auth, params: { commentID } }) => {
      const [current] = await db
        .select()
        .from(schema.chiiSubjectInterests)
        .where(op.eq(schema.chiiSubjectInterests.id, commentID))
        .limit(1);
      if (!current || current.hasComment !== 1) {
        throw new NotFoundError(`subject comment ${commentID}`);
      }
      if (current.uid !== auth.userID) {
        throw new NotAllowedError('delete a subject comment which is not yours');
      }
      await rateLimit(LimitAction.Comment, auth.userID);
      await db
        .update(schema.chiiSubjectInterests)
        .set({
          comment: '',
          hasComment: 0,
          updatedAt: DateTime.now().toUnixInteger(),
        })
        .where(op.eq(schema.chiiSubjectInterests.id, commentID))
        .limit(1);
      return {};
    },
  );

  app.put(
    '/subjects/-/comments/:commentID/like',
    {
      schema: {
        summary: '给条目的吐槽点赞',
        operationId: 'likeSubjectComment',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          commentID: t.Integer(),
        }),
        body: t.Object({
          value: t.Integer(),
        }),
        response: {
          200: t.Object({}),
          429: res.Ref(res.Error),
        },
      },
      preHandler: [requireLogin('liking a subject comment')],
    },
    async ({ auth, params: { commentID }, body: { value } }) => {
      const [comment] = await db
        .select({ subjectID: schema.chiiSubjectInterests.subjectID })
        .from(schema.chiiSubjectInterests)
        .where(op.eq(schema.chiiSubjectInterests.id, commentID))
        .limit(1);
      if (!comment) {
        throw new NotFoundError(`comment ${commentID}`);
      }
      await Reaction.add({
        type: LikeType.SubjectCollect,
        mid: comment.subjectID,
        rid: commentID,
        uid: auth.userID,
        value,
      });
      return {};
    },
  );

  app.delete(
    '/subjects/-/comments/:commentID/like',
    {
      schema: {
        summary: '取消条目的吐槽点赞',
        operationId: 'unlikeSubjectComment',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          commentID: t.Integer(),
        }),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('liking a subject comment')],
    },
    async ({ auth, params: { commentID } }) => {
      await Reaction.delete({
        type: LikeType.SubjectCollect,
        rid: commentID,
        uid: auth.userID,
      });
      return {};
    },
  );

  app.get(
    '/subjects/:subjectID/reviews',
    {
      schema: {
        summary: '获取条目的评论',
        operationId: 'getSubjectReviews',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 5, minimum: 1, maximum: 20, description: 'max 20' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.SubjectReview)),
        },
      },
    },
    async ({ auth, params: { subjectID }, query: { limit = 5, offset = 0 } }) => {
      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiSubjectRelatedBlogs.subjectID, subjectID),
        op.eq(schema.chiiBlogEntries.public, true),
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiSubjectRelatedBlogs)
        .innerJoin(
          schema.chiiBlogEntries,
          op.eq(schema.chiiSubjectRelatedBlogs.entryID, schema.chiiBlogEntries.id),
        )
        .where(condition);
      const data = await db
        .select()
        .from(schema.chiiSubjectRelatedBlogs)
        .innerJoin(
          schema.chiiBlogEntries,
          op.eq(schema.chiiSubjectRelatedBlogs.entryID, schema.chiiBlogEntries.id),
        )
        .where(condition)
        .orderBy(op.desc(schema.chiiBlogEntries.createdAt))
        .limit(limit)
        .offset(offset);
      const uids = data.map((d) => d.chii_subject_related_blog.uid);
      const users = await fetcher.fetchSlimUsersByIDs(uids);
      const reviews: res.ISubjectReview[] = [];
      for (const d of data) {
        const user = users[d.chii_subject_related_blog.uid];
        if (!user) {
          continue;
        }
        const review = {
          id: d.chii_subject_related_blog.id,
          user,
          entry: convert.toSlimBlogEntry(d.chii_blog_entry),
        };
        reviews.push(review);
      }
      return {
        data: reviews,
        total: count,
      };
    },
  );

  app.get(
    '/subjects/:subjectID/indexes',
    {
      schema: {
        summary: '获取条目关联的目录',
        operationId: 'getSubjectIndexes',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.SlimIndex)),
        },
      },
    },
    async ({ auth, params: { subjectID }, query: { limit = 20, offset = 0 } }) => {
      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiIndexRelated.sid, subjectID),
        op.eq(schema.chiiIndexRelated.ban, 0),
        op.eq(schema.chiiIndexRelated.cat, IndexRelatedCategory.Subject),
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.countDistinct(schema.chiiIndexRelated.rid) })
        .from(schema.chiiIndexRelated)
        .where(condition);
      const data = await db
        .select({ indexID: schema.chiiIndexRelated.rid })
        .from(schema.chiiIndexRelated)
        .where(condition)
        .groupBy(schema.chiiIndexRelated.rid)
        .orderBy(op.desc(op.max(schema.chiiIndexRelated.id)))
        .limit(limit)
        .offset(offset);
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
        if (index.private && (!auth || index.uid !== auth.userID)) {
          continue;
        }
        index.user = users[index.uid];
        indexes.push(index);
      }
      return {
        data: indexes,
        total: count,
      };
    },
  );

  app.get(
    '/subjects/:subjectID/collects',
    {
      schema: {
        summary: '获取条目的收藏用户',
        operationId: 'getSubjectCollects',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        querystring: t.Object({
          type: t.Optional(req.Ref(req.CollectionType)),
          mode: t.Optional(
            req.Ref(req.FilterMode, {
              description: '默认为 all, 未登录或没有好友时始终为 all',
            }),
          ),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(
            t.Integer({ default: 0, minimum: 0, maximum: 500, description: 'min 0' }),
          ),
        }),
        response: {
          200: res.Paged(res.Ref(res.SubjectCollect)),
        },
      },
    },
    async ({
      auth,
      params: { subjectID },
      query: { type, mode = req.IFilterMode.All, limit = 20, offset = 0 },
    }) => {
      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      const condition = [
        op.eq(schema.chiiSubjectInterests.subjectID, subjectID),
        op.eq(schema.chiiSubjectInterests.privacy, CollectionPrivacy.Public),
      ];
      if (type) {
        condition.push(op.eq(schema.chiiSubjectInterests.type, type));
      }
      if (auth.login && mode === req.IFilterMode.Friends) {
        const friendIDs = await fetchFriends(auth.userID);
        if (friendIDs.length > 0) {
          condition.push(op.inArray(schema.chiiSubjectInterests.uid, friendIDs));
        }
      }
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiSubjectInterests, { forceIndex: 'subject_lasttouch' })
        .where(op.and(...condition));
      const data = await db
        .select()
        .from(schema.chiiSubjectInterests, { forceIndex: 'subject_lasttouch' })
        .where(op.and(...condition))
        .orderBy(op.desc(schema.chiiSubjectInterests.updatedAt))
        .limit(limit)
        .offset(offset);
      const uids = data.map((d) => d.uid);
      const users = await fetcher.fetchSlimUsersByIDs(uids);
      const result: res.ISubjectCollect[] = [];
      for (const d of data) {
        const user = users[d.uid];
        if (!user) {
          continue;
        }
        const interest = convert.toSlimSubjectInterest(d);
        result.push({
          user,
          interest,
        });
      }
      return {
        data: result,
        total: count,
      };
    },
  );

  app.put(
    '/subjects/-/collects/:collectID/like',
    {
      schema: {
        summary: '给条目收藏点赞',
        operationId: 'likeSubjectCollect',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          collectID: t.Integer(),
        }),
        body: t.Object({
          value: t.Integer(),
        }),
        response: {
          200: t.Object({}),
          429: res.Ref(res.Error),
        },
      },
      preHandler: [requireLogin('liking a subject collect')],
    },
    async ({ auth, params: { collectID }, body: { value } }) => {
      const [interest] = await db
        .select({ sid: schema.chiiSubjectInterests.subjectID })
        .from(schema.chiiSubjectInterests)
        .where(op.eq(schema.chiiSubjectInterests.id, collectID))
        .limit(1);
      if (!interest) {
        throw new NotFoundError(`subject interest ${collectID}`);
      }
      await Reaction.add({
        type: LikeType.SubjectCollect,
        mid: interest.sid,
        rid: collectID,
        uid: auth.userID,
        value,
      });
      return {};
    },
  );

  app.delete(
    '/subjects/-/collects/:collectID/like',
    {
      schema: {
        summary: '取消条目收藏点赞',
        operationId: 'unlikeSubjectCollect',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          collectID: t.Integer(),
        }),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('liking a subject collect')],
    },
    async ({ auth, params: { collectID } }) => {
      await Reaction.delete({
        type: LikeType.SubjectCollect,
        rid: collectID,
        uid: auth.userID,
      });
      return {};
    },
  );

  app.get(
    '/subjects/:subjectID/topics',
    {
      schema: {
        summary: '获取条目讨论版',
        operationId: 'getSubjectTopics',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.Topic)),
        },
      },
    },
    async ({ auth, params: { subjectID }, query: { limit = 20, offset = 0 } }) => {
      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      const conditions = [op.eq(schema.chiiSubjectTopics.subjectID, subjectID)];
      if (!auth.permission.manage_topic_state) {
        conditions.push(op.eq(schema.chiiSubjectTopics.display, TopicDisplay.Normal));
      }
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiSubjectTopics)
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiSubjectTopics.uid, schema.chiiUsers.id))
        .where(op.and(...conditions));
      const data = await db
        .select()
        .from(schema.chiiSubjectTopics)
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiSubjectTopics.uid, schema.chiiUsers.id))
        .where(op.and(...conditions))
        .orderBy(op.desc(schema.chiiSubjectTopics.createdAt))
        .limit(limit)
        .offset(offset);
      const topics = data.map((d) => convert.toSubjectTopic(d.chii_subject_topics));
      const uids = topics.map((t) => t.creatorID);
      const users = await fetcher.fetchSlimUsersByIDs(uids);
      for (const topic of topics) {
        topic.creator = users[topic.creatorID];
      }
      return {
        data: topics,
        total: count,
      };
    },
  );

  app.get(
    '/subjects/-/topics',
    {
      schema: {
        operationId: 'getRecentSubjectTopics',
        summary: '获取最新的条目讨论',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.SubjectTopic)),
        },
      },
    },
    async ({ auth, query: { limit = 20, offset = 0 } }) => {
      const conditions = [op.eq(schema.chiiSubjectTopics.display, TopicDisplay.Normal)];
      if (!auth.allowNsfw) {
        conditions.push(op.eq(schema.chiiSubjects.nsfw, false));
      }
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiSubjectTopics)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiSubjectTopics.subjectID, schema.chiiSubjects.id),
        )
        .where(op.and(...conditions));
      const data = await db
        .select()
        .from(schema.chiiSubjectTopics)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiSubjectTopics.subjectID, schema.chiiSubjects.id),
        )
        .where(op.and(...conditions))
        .orderBy(op.desc(schema.chiiSubjectTopics.updatedAt))
        .limit(limit)
        .offset(offset);
      const uids = data.map((d) => d.chii_subject_topics.uid);
      const users = await fetcher.fetchSlimUsersByIDs(uids);
      const subjectIDs = data.map((d) => d.chii_subject_topics.subjectID);
      const subjects = await fetcher.fetchSlimSubjectsByIDs(subjectIDs);
      const topics: res.ISubjectTopic[] = [];
      for (const d of data) {
        const subject = subjects[d.chii_subject_topics.subjectID];
        if (!subject) {
          continue;
        }
        const creator = users[d.chii_subject_topics.uid];
        if (!creator) {
          continue;
        }
        const topic = convert.toSubjectTopic(d.chii_subject_topics);
        topic.creator = creator;
        topics.push({
          ...topic,
          subject,
          creator,
          replies: [],
        });
      }
      return {
        data: topics,
        total: count,
      };
    },
  );

  app.post(
    '/subjects/:subjectID/topics',
    {
      schema: {
        summary: '创建条目讨论',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        operationId: 'createSubjectTopic',
        params: t.Object({
          subjectID: t.Integer({ minimum: 1 }),
        }),
        body: t.Intersect([req.Ref(req.CreateTopic), req.Ref(req.TurnstileToken)]),
        response: {
          200: t.Object({
            id: t.Integer({ description: 'new topic id' }),
          }),
          429: res.Ref(res.Error),
        },
      },
      preHandler: [requireLogin('creating a topic'), requireTurnstileToken()],
    },
    async ({ auth, body: { title, content }, params: { subjectID } }) => {
      if (auth.permission.ban_post) {
        throw new NotAllowedError('create topic');
      }
      if (!Dam.allCharacterPrintable(title)) {
        throw new BadRequestError('title contains invalid invisible character');
      }
      if (!Dam.allCharacterPrintable(content)) {
        throw new BadRequestError('content contains invalid invisible character');
      }

      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      const state = CommentState.Normal;
      let display: TopicDisplay = TopicDisplay.Normal;
      if (dam.needReview(title) || dam.needReview(content)) {
        display = TopicDisplay.Review;
      }

      await rateLimit(LimitAction.Topic, auth.userID);
      const now = DateTime.now().toUnixInteger();

      let topicID = 0;
      await db.transaction(async (t) => {
        const [{ insertId }] = await t.insert(schema.chiiSubjectTopics).values({
          createdAt: now,
          updatedAt: now,
          subjectID,
          uid: auth.userID,
          title,
          replies: 0,
          state,
          display,
        });
        await t.insert(schema.chiiSubjectPosts).values({
          content,
          uid: auth.userID,
          createdAt: now,
          state,
          mid: insertId,
          related: 0,
        });
        topicID = insertId;
      });

      return { id: topicID };
    },
  );

  app.get(
    '/subjects/-/topics/:topicID',
    {
      schema: {
        operationId: 'getSubjectTopic',
        summary: '获取条目讨论详情',
        tags: [Tag.Topic],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          topicID: t.Integer(),
        }),
        response: {
          200: res.Ref(res.SubjectTopic),
        },
      },
    },
    async ({ auth, params: { topicID } }) => {
      const [topic] = await db
        .select()
        .from(schema.chiiSubjectTopics)
        .where(op.eq(schema.chiiSubjectTopics.id, topicID))
        .limit(1);
      if (!topic) {
        throw new NotFoundError(`topic ${topicID}`);
      }
      if (!CanViewTopicContent(auth, topic.state, topic.display, topic.uid)) {
        throw new NotFoundError(`topic ${topicID}`);
      }
      const subject = await fetcher.fetchSlimSubjectByID(topic.subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${topic.subjectID}`);
      }
      const viewerID = auth.login ? auth.userID : undefined;
      const replies = await subjectPostService.getReplies(topicID, viewerID);
      const users = await fetcher.fetchSlimUsersByIDs([topic.uid], viewerID);
      const creator = users[topic.uid];
      if (!creator) {
        throw new NotFoundError(`user ${topic.uid}`);
      }
      return {
        ...convert.toSubjectTopic(topic),
        subject,
        creator,
        replies,
      };
    },
  );

  app.put(
    '/subjects/-/topics/:topicID',
    {
      schema: {
        summary: '编辑自己创建的条目讨论',
        operationId: 'updateSubjectTopic',
        tags: [Tag.Topic],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          topicID: t.Integer({ minimum: 1 }),
        }),
        body: req.UpdateTopic,
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('updating a topic')],
    },
    async ({ auth, body: { title, content }, params: { topicID } }) => {
      if (auth.permission.ban_post) {
        throw new NotAllowedError('create reply');
      }
      if (!Dam.allCharacterPrintable(content)) {
        throw new BadRequestError('content contains invalid invisible character');
      }

      const [topic] = await db
        .select()
        .from(schema.chiiSubjectTopics)
        .where(op.eq(schema.chiiSubjectTopics.id, topicID))
        .limit(1);
      if (!topic) {
        throw new NotFoundError(`topic ${topicID}`);
      }
      const [post] = await db
        .select()
        .from(schema.chiiSubjectPosts)
        .where(
          op.and(
            op.eq(schema.chiiSubjectPosts.mid, topicID),
            op.eq(schema.chiiSubjectPosts.related, 0),
          ),
        )
        .orderBy(op.asc(schema.chiiSubjectPosts.id))
        .limit(1);
      if (!post) {
        throw new UnexpectedNotFoundError(`top post of topic ${topicID}`);
      }

      if (!canEditTopic(topic.state)) {
        throw new NotAllowedError('edit this topic');
      }
      if (topic.uid !== auth.userID) {
        throw new NotAllowedError('update topic');
      }
      if (post.uid !== auth.userID) {
        throw new NotAllowedError('update topic content');
      }

      let display = topic.display;
      if (dam.needReview(title) || dam.needReview(content)) {
        if (display === TopicDisplay.Normal) {
          display = TopicDisplay.Review;
        } else {
          throw new BadRequestError('topic is already in review');
        }
      }

      await rateLimit(LimitAction.Topic, auth.userID);
      await db.transaction(async (t) => {
        await t
          .update(schema.chiiSubjectTopics)
          .set({ title, display })
          .where(op.eq(schema.chiiSubjectTopics.id, topic.id));
        await t
          .update(schema.chiiSubjectPosts)
          .set({ content })
          .where(op.eq(schema.chiiSubjectPosts.id, post.id));
      });

      return {};
    },
  );

  app.get(
    '/subjects/-/posts/:postID',
    {
      schema: {
        operationId: 'getSubjectPost',
        summary: '获取条目讨论回复详情',
        tags: [Tag.Topic],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          postID: t.Integer(),
        }),
        response: {
          200: res.Ref(res.Post),
        },
      },
    },
    async ({ auth, params: { postID } }) => {
      const viewerID = auth.login ? auth.userID : undefined;
      const { post, topic, creator, topicCreator } = await subjectPostService.getPost(
        postID,
        viewerID,
      );
      return {
        id: post.id,
        creatorID: post.uid,
        creator,
        createdAt: post.createdAt,
        content: post.content,
        state: post.state,
        topic: {
          ...convert.toSubjectTopic(topic),
          creator: topicCreator,
          replies: topic.replies,
        },
      };
    },
  );

  app.put(
    '/subjects/-/posts/:postID/like',
    {
      schema: {
        summary: '给条目讨论回复点赞',
        operationId: 'likeSubjectPost',
        tags: [Tag.Topic],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          postID: t.Integer(),
        }),
        body: t.Object({
          value: t.Integer(),
        }),
        response: {
          200: t.Object({}),
          429: res.Ref(res.Error),
        },
      },
      preHandler: [requireLogin('liking a subject post')],
    },
    async ({ auth, params: { postID }, body: { value } }) => {
      await subjectPostService.like(auth, postID, value);
      return {};
    },
  );

  app.delete(
    '/subjects/-/posts/:postID/like',
    {
      schema: {
        summary: '取消条目讨论回复点赞',
        operationId: 'unlikeSubjectPost',
        tags: [Tag.Topic],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          postID: t.Integer(),
        }),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('liking a subject post')],
    },
    async ({ auth, params: { postID } }) => {
      await subjectPostService.unlike(auth, postID);
      return {};
    },
  );

  app.put(
    '/subjects/-/posts/:postID',
    {
      schema: {
        operationId: 'editSubjectPost',
        summary: '编辑条目讨论回复',
        tags: [Tag.Topic],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          postID: t.Integer(),
        }),
        body: req.Ref(req.UpdateContent),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('editing a post')],
    },
    async ({ auth, body: { content }, params: { postID } }) => {
      await subjectPostService.update(auth, postID, content);
      return {};
    },
  );

  app.delete(
    '/subjects/-/posts/:postID',
    {
      schema: {
        summary: '删除条目讨论回复',
        operationId: 'deleteSubjectPost',
        tags: [Tag.Topic],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          postID: t.Integer(),
        }),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('deleting a post')],
    },
    async ({ auth, params: { postID } }) => {
      await subjectPostService.delete(auth, postID);
      return {};
    },
  );

  app.post(
    '/subjects/-/topics/:topicID/replies',
    {
      schema: {
        operationId: 'createSubjectReply',
        summary: '创建条目讨论回复',
        tags: [Tag.Topic],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          topicID: t.Integer(),
        }),
        body: t.Intersect([req.Ref(req.CreateReply), req.Ref(req.TurnstileToken)]),
        response: {
          200: t.Object({ id: t.Integer() }),
          429: res.Ref(res.Error),
        },
      },
      preHandler: [requireLogin('creating a reply'), requireTurnstileToken()],
    },
    async ({ auth, params: { topicID }, body: { content, replyTo = 0 } }) => {
      const [topic] = await db
        .select()
        .from(schema.chiiSubjectTopics)
        .where(op.eq(schema.chiiSubjectTopics.id, topicID))
        .limit(1);
      if (!topic) {
        throw new NotFoundError(`topic ${topicID}`);
      }

      return await subjectPostService.create(auth, topic, content, replyTo);
    },
  );
}
