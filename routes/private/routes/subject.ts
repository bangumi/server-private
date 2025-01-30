import { Type as t } from '@sinclair/typebox';
import { DateTime } from 'luxon';

import { db, op } from '@app/drizzle/db.ts';
import type * as orm from '@app/drizzle/orm.ts';
import * as schema from '@app/drizzle/schema';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { Dam, dam } from '@app/lib/dam.ts';
import {
  BadRequestError,
  CaptchaError,
  NotFoundError,
  UnexpectedNotFoundError,
} from '@app/lib/error.ts';
import * as Notify from '@app/lib/notify.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { turnstile } from '@app/lib/services/turnstile.ts';
import type { SubjectFilter, SubjectSort } from '@app/lib/subject/type.ts';
import { CanViewTopicContent, CanViewTopicReply } from '@app/lib/topic/display.ts';
import { canEditTopic, canReplyPost } from '@app/lib/topic/state';
import { CommentState, TopicDisplay } from '@app/lib/topic/type.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { LimitAction } from '@app/lib/utils/rate-limit';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import { rateLimit } from '@app/routes/hooks/rate-limit';
import type { App } from '@app/routes/type.ts';

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
  actors: res.ISlimPerson[],
): res.ISubjectCharacter {
  return {
    character: convert.toSlimCharacter(character),
    actors: actors,
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
      const data = await db
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
        );
      for (const d of data) {
        return convert.toSubject(d.chii_subjects, d.chii_subject_fields);
      }
      throw new NotFoundError(`subject ${subjectID}`);
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
          sort: req.Ref(req.SubjectSort),
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
            t.Array(t.String({ description: 'wiki 标签，包括 分类/来源/类型/题材/地区/受众 等' })),
          ),
        }),
        response: {
          200: res.Paged(res.Ref(res.Subject)),
        },
      },
    },
    async ({ auth, query: { type, cat, series, year, month, sort, tags, page = 1 } }) => {
      const filter = {
        type,
        nsfw: auth.allowNsfw,
        cat,
        series,
        year,
        month,
        tags,
      } satisfies SubjectFilter;
      const result = await fetcher.fetchSubjectIDsByFilter(filter, sort as SubjectSort, page);
      if (result.data.length === 0) {
        return {
          data: [],
          total: result.total,
        };
      }
      const subjects = await fetcher.fetchSubjectsByIDs(result.data);
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
        summary: '获取条目的剧集',
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
      const episodes = data.map((d) => convert.toSlimEpisode(d));
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
          summary: r.summary,
          appearEps: r.appearEps,
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
        );
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

      const result: res.ISubjectPosition[] = [];
      for (const pid of positionIDs) {
        const position = positions[pid];
        if (position) {
          result.push({
            position: position,
            staffs: relations[pid] || [],
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
          200: res.Paged(res.Ref(res.SubjectComment)),
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
        op.eq(schema.chiiSubjectInterests.private, false),
        op.eq(schema.chiiSubjectInterests.hasComment, 1),
        type ? op.eq(schema.chiiSubjectInterests.type, type) : undefined,
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiSubjectInterests)
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiSubjectInterests.uid, schema.chiiUsers.id))
        .where(condition);
      const data = await db
        .select()
        .from(schema.chiiSubjectInterests)
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiSubjectInterests.uid, schema.chiiUsers.id))
        .where(condition)
        .orderBy(op.desc(schema.chiiSubjectInterests.updatedAt))
        .limit(limit)
        .offset(offset);
      const comments = data.map((d) =>
        convert.toSubjectComment(d.chii_subject_interests, d.chii_members),
      );
      return {
        data: comments,
        total: count,
      };
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
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiSubjectRelatedBlogs.uid, schema.chiiUsers.id))
        .innerJoin(
          schema.chiiBlogEntries,
          op.eq(schema.chiiSubjectRelatedBlogs.entryID, schema.chiiBlogEntries.id),
        )
        .where(condition);
      const data = await db
        .select()
        .from(schema.chiiSubjectRelatedBlogs)
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiSubjectRelatedBlogs.uid, schema.chiiUsers.id))
        .innerJoin(
          schema.chiiBlogEntries,
          op.eq(schema.chiiSubjectRelatedBlogs.entryID, schema.chiiBlogEntries.id),
        )
        .where(condition)
        .orderBy(op.desc(schema.chiiBlogEntries.createdAt))
        .limit(limit)
        .offset(offset);
      const reviews = data.map((d) =>
        convert.toSubjectReview(d.chii_subject_related_blog, d.chii_blog_entry, d.chii_members),
      );
      return {
        data: reviews,
        total: count,
      };
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

  app.post(
    '/subjects/:subjectID/topics',
    {
      schema: {
        summary: '创建条目讨论',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        operationId: 'createSubjectTopic',
        params: t.Object({
          subjectID: t.Integer({ examples: [114514], minimum: 0 }),
        }),
        response: {
          200: t.Object({
            id: t.Integer({ description: 'new topic id' }),
          }),
        },
        body: res.Ref(req.CreateTopic),
      },
      preHandler: [requireLogin('creating a topic')],
    },
    async ({
      auth,
      body: { title, content, 'cf-turnstile-response': cfCaptchaResponse },
      params: { subjectID },
    }) => {
      if (!(await turnstile.verify(cfCaptchaResponse ?? ''))) {
        throw new CaptchaError();
      }
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
      let display = TopicDisplay.Normal;
      if (dam.needReview(title) || dam.needReview(content)) {
        display = TopicDisplay.Review;
      }

      await rateLimit(LimitAction.Subject, auth.userID);
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
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          topicID: t.Integer(),
        }),
        response: {
          200: res.Ref(res.TopicDetail),
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
      const creator = await fetcher.fetchSlimUserByID(topic.uid);
      if (!creator) {
        throw new NotFoundError(`user ${topic.uid}`);
      }
      const replies = await db
        .select()
        .from(schema.chiiSubjectPosts)
        .where(op.eq(schema.chiiSubjectPosts.mid, topicID));
      const top = replies.shift();
      if (!top || top.related !== 0) {
        throw new UnexpectedNotFoundError(`top reply of topic ${topicID}`);
      }
      const uids = replies.map((x) => x.uid);
      const users = await fetcher.fetchSlimUsersByIDs(uids);
      const subReplies: Record<number, res.ISubReply[]> = {};
      for (const x of replies.filter((x) => x.related !== 0)) {
        if (!CanViewTopicReply(x.state)) {
          x.content = '';
        }
        const sub = convert.toSubjectTopicSubReply(x);
        sub.creator = users[sub.creatorID];
        const subR = subReplies[x.related] ?? [];
        subR.push(sub);
        subReplies[x.related] = subR;
      }
      const topLevelReplies = [];
      for (const x of replies.filter((x) => x.related === 0)) {
        if (!CanViewTopicReply(x.state)) {
          x.content = '';
        }
        const reply = convert.toSubjectTopicReply(x);
        reply.replies = subReplies[reply.id] ?? [];
        topLevelReplies.push(reply);
      }
      return {
        id: topic.id,
        parent: subject,
        creator,
        title: topic.title,
        content: top.content,
        state: topic.state,
        createdAt: topic.createdAt,
        replies: topLevelReplies,
        reactions: [],
        display: topic.display,
      };
    },
  );

  app.put(
    '/subjects/-/topics/:topicID',
    {
      schema: {
        summary: '编辑自己创建的条目讨论',
        operationId: 'updateSubjectTopic',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          topicID: t.Integer({ examples: [371602], minimum: 0 }),
        }),
        body: req.UpdateTopic,
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

      if (!canEditTopic(topic.state)) {
        throw new NotAllowedError('edit this topic');
      }
      if (topic.uid !== auth.userID) {
        throw new NotAllowedError('update topic');
      }

      let display = topic.display;
      if (dam.needReview(title) || dam.needReview(content)) {
        if (display === TopicDisplay.Normal) {
          display = TopicDisplay.Review;
        } else {
          return {};
        }
      }

      await db.transaction(async (t) => {
        await t
          .update(schema.chiiSubjectTopics)
          .set({ title, display })
          .where(op.eq(schema.chiiSubjectTopics.id, topicID));
        await t
          .update(schema.chiiSubjectPosts)
          .set({ content })
          .where(op.eq(schema.chiiSubjectPosts.mid, topicID));
      });

      return {};
    },
  );

  app.put(
    '/subjects/-/posts/:postID',
    {
      schema: {
        operationId: 'editSubjectPost',
        summary: '编辑条目讨论回复',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          postID: t.Integer(),
        }),
        body: req.Ref(req.UpdatePost),
      },
      preHandler: [requireLogin('editing a post')],
    },
    async ({ auth, body: { content }, params: { postID } }) => {
      if (auth.permission.ban_post) {
        throw new NotAllowedError('edit reply');
      }
      if (!Dam.allCharacterPrintable(content)) {
        throw new BadRequestError('content contains invalid invisible character');
      }

      const [post] = await db
        .select()
        .from(schema.chiiSubjectPosts)
        .where(op.eq(schema.chiiSubjectPosts.id, postID))
        .limit(1);
      if (!post) {
        throw new NotFoundError(`post ${postID}`);
      }

      if (post.uid !== auth.userID) {
        throw new NotAllowedError('edit reply not created by you');
      }

      const [topic] = await db
        .select()
        .from(schema.chiiSubjectTopics)
        .where(op.eq(schema.chiiSubjectTopics.id, post.mid))
        .limit(1);
      if (!topic) {
        throw new UnexpectedNotFoundError(`topic ${post.mid}`);
      }
      if (topic.state === CommentState.AdminCloseTopic) {
        throw new NotAllowedError('edit reply in a closed topic');
      }
      if ([CommentState.AdminDelete, CommentState.UserDelete].includes(post.state)) {
        throw new NotAllowedError('edit a deleted reply');
      }

      const [reply] = await db
        .select()
        .from(schema.chiiSubjectPosts)
        .where(
          op.and(
            op.eq(schema.chiiSubjectPosts.mid, topic.id),
            op.eq(schema.chiiSubjectPosts.related, postID),
          ),
        )
        .limit(1);
      if (reply) {
        throw new NotAllowedError('edit a post with reply');
      }

      await db
        .update(schema.chiiSubjectPosts)
        .set({ content })
        .where(op.eq(schema.chiiSubjectPosts.id, postID));

      return {};
    },
  );

  app.delete(
    '/subjects/-/posts/:postID',
    {
      schema: {
        summary: '删除条目讨论回复',
        operationId: 'deleteSubjectPost',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          postID: t.Integer(),
        }),
      },
      preHandler: [requireLogin('deleting a post')],
    },
    async ({ auth, params: { postID } }) => {
      const [post] = await db
        .select()
        .from(schema.chiiSubjectPosts)
        .where(op.eq(schema.chiiSubjectPosts.id, postID))
        .limit(1);
      if (!post) {
        throw new NotFoundError(`post ${postID}`);
      }

      if (post.uid !== auth.userID) {
        throw new NotAllowedError('delete reply not created by you');
      }

      await db
        .update(schema.chiiSubjectPosts)
        .set({ state: CommentState.UserDelete })
        .where(op.eq(schema.chiiSubjectPosts.id, postID));

      return {};
    },
  );

  app.post(
    '/subjects/-/topics/:topicID/replies',
    {
      schema: {
        operationId: 'createSubjectReply',
        summary: '创建条目讨论回复',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          topicID: t.Integer(),
        }),
        body: req.Ref(req.CreatePost),
        response: {
          200: t.Object({ id: t.Integer() }),
        },
      },
      preHandler: [requireLogin('creating a reply')],
    },
    async ({
      auth,
      params: { topicID },
      body: { 'cf-turnstile-response': cfCaptchaResponse, content, replyTo = 0 },
    }) => {
      if (!(await turnstile.verify(cfCaptchaResponse))) {
        throw new CaptchaError();
      }
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
      if (topic.state === CommentState.AdminCloseTopic) {
        throw new NotAllowedError('reply to a closed topic');
      }

      let notifyUserID = topic.uid;
      if (replyTo) {
        const [parent] = await db
          .select()
          .from(schema.chiiSubjectPosts)
          .where(op.eq(schema.chiiSubjectPosts.id, replyTo))
          .limit(1);
        if (!parent) {
          throw new NotFoundError(`post ${replyTo}`);
        }
        if (!canReplyPost(parent.state)) {
          throw new NotAllowedError('reply to a admin action post');
        }
        notifyUserID = parent.uid;
      }

      await rateLimit(LimitAction.Subject, auth.userID);

      const now = DateTime.now();

      let postID = 0;
      await db.transaction(async (t) => {
        const [{ count = 0 } = {}] = await t
          .select({ count: op.count() })
          .from(schema.chiiSubjectPosts)
          .where(
            op.and(
              op.eq(schema.chiiSubjectPosts.mid, topicID),
              op.eq(schema.chiiSubjectPosts.state, CommentState.Normal),
            ),
          );
        const [{ insertId }] = await t.insert(schema.chiiSubjectPosts).values({
          mid: topicID,
          uid: auth.userID,
          related: replyTo,
          content,
          state: CommentState.Normal,
          createdAt: now.toUnixInteger(),
        });
        postID = insertId;
        const topicUpdate: Record<string, number> = {
          replies: count,
        };
        if (topic.state !== CommentState.AdminSilentTopic) {
          topicUpdate.updatedAt = now.toUnixInteger();
        }
        await t
          .update(schema.chiiSubjectTopics)
          .set(topicUpdate)
          .where(op.eq(schema.chiiSubjectTopics.id, topicID));
      });

      await Notify.create({
        destUserID: notifyUserID,
        sourceUserID: auth.userID,
        now,
        type: replyTo === 0 ? Notify.Type.SubjectTopicReply : Notify.Type.SubjectPostReply,
        postID,
        topicID: topic.id,
        title: topic.title,
      });

      return { id: postID };
    },
  );
}
