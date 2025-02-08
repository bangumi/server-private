import { Type as t } from '@sinclair/typebox';
import { DateTime } from 'luxon';

import { db, decr, incr, op } from '@app/drizzle/db.ts';
import type * as orm from '@app/drizzle/orm.ts';
import * as schema from '@app/drizzle/schema';
import { Dam, dam } from '@app/lib/dam';
import { BadRequestError, UnexpectedNotFoundError } from '@app/lib/error';
import { NotFoundError } from '@app/lib/error';
import { logger } from '@app/lib/logger';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import {
  CollectionPrivacy,
  getCollectionTypeField,
  PersonType,
  SubjectType,
} from '@app/lib/subject/type.ts';
import { updateSubjectRating } from '@app/lib/subject/utils.ts';
import { TimelineWriter } from '@app/lib/timeline/writer';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { LimitAction } from '@app/lib/utils/rate-limit';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import { rateLimit } from '@app/routes/hooks/rate-limit';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/collections/subjects',
    {
      schema: {
        summary: '获取当前用户的条目收藏',
        operationId: 'getMySubjectCollections',
        tags: [Tag.Collection],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          subjectType: t.Optional(req.Ref(req.SubjectType)),
          type: t.Optional(req.Ref(req.CollectionType)),
          since: t.Optional(t.Integer({ minimum: 0, description: '起始时间戳' })),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.Subject)),
        },
      },
      preHandler: [requireLogin('get my subject collections')],
    },
    async ({ auth, query: { subjectType, type, since, limit = 20, offset = 0 } }) => {
      const conditions = op.and(
        op.eq(schema.chiiSubjectInterests.uid, auth.userID),
        subjectType ? op.eq(schema.chiiSubjectInterests.subjectType, subjectType) : undefined,
        type
          ? op.eq(schema.chiiSubjectInterests.type, type)
          : op.ne(schema.chiiSubjectInterests.type, 0),
        since ? op.gte(schema.chiiSubjectInterests.updatedAt, since) : undefined,
        op.ne(schema.chiiSubjects.ban, 1),
        op.eq(schema.chiiSubjectFields.redirect, 0),
        auth.allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
      );

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiSubjectInterests)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiSubjectInterests.subjectID, schema.chiiSubjects.id),
        )
        .innerJoin(
          schema.chiiSubjectFields,
          op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id),
        )
        .where(conditions);

      const data = await db
        .select()
        .from(schema.chiiSubjectInterests)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiSubjectInterests.subjectID, schema.chiiSubjects.id),
        )
        .innerJoin(
          schema.chiiSubjectFields,
          op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id),
        )
        .where(conditions)
        .orderBy(op.desc(schema.chiiSubjectInterests.updatedAt))
        .limit(limit)
        .offset(offset);

      const collections = data.map((d) => {
        const interest = convert.toSubjectInterest(d.chii_subject_interests);
        const subject = convert.toSubject(d.chii_subjects, d.chii_subject_fields);
        return {
          ...subject,
          interest,
        };
      });

      return {
        data: collections,
        total: count,
      };
    },
  );

  app.patch(
    '/collections/subjects/:subjectID',
    {
      schema: {
        summary: '更新条目进度',
        operationId: 'updateSubjectProgress',
        tags: [Tag.Collection],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        body: req.Ref(req.UpdateSubjectProgress),
      },
      preHandler: [requireLogin('update subject progress')],
    },
    async ({ auth, params: { subjectID }, body: { epStatus, volStatus } }) => {
      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      switch (subject.type) {
        case SubjectType.Book:
        case SubjectType.Anime:
        case SubjectType.Real: {
          break;
        }
        default: {
          throw new BadRequestError(`subject not supported for progress`);
        }
      }
      const [interest] = await db
        .select()
        .from(schema.chiiSubjectInterests)
        .where(
          op.and(
            op.eq(schema.chiiSubjectInterests.uid, auth.userID),
            op.eq(schema.chiiSubjectInterests.subjectID, subjectID),
          ),
        )
        .limit(1);
      if (!interest) {
        throw new NotFoundError(`subject not collected`);
      }
      const toUpdate: Partial<orm.ISubjectInterest> = {};
      if (epStatus !== undefined) {
        toUpdate.epStatus = epStatus;
      }
      if (volStatus !== undefined) {
        toUpdate.volStatus = volStatus;
      }
      if (Object.keys(toUpdate).length === 0) {
        throw new BadRequestError('no update');
      }
      toUpdate.updatedAt = DateTime.now().toUnixInteger();
      await db
        .update(schema.chiiSubjectInterests)
        .set(toUpdate)
        .where(
          op.and(
            op.eq(schema.chiiSubjectInterests.uid, auth.userID),
            op.eq(schema.chiiSubjectInterests.subjectID, subjectID),
          ),
        )
        .limit(1);
      try {
        await TimelineWriter.progressSubject(auth.userID, subjectID, epStatus, volStatus);
      } catch (error) {
        logger.error(`failed to write timeline for subject ${subjectID}`, {
          error,
          userID: auth.userID,
        });
      }
    },
  );

  app.put(
    '/collections/subjects/:subjectID',
    {
      schema: {
        summary: '新增或修改条目收藏',
        operationId: 'updateSubjectCollection',
        tags: [Tag.Collection],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        body: req.Ref(req.CollectSubject),
      },
      preHandler: [requireLogin('update subject collection')],
    },
    async ({ auth, params: { subjectID }, body: { type, rate, comment, priv, tags } }) => {
      const slimSubject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!slimSubject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      let privacy: CollectionPrivacy | undefined;
      if (priv !== undefined) {
        privacy = priv ? CollectionPrivacy.Private : CollectionPrivacy.Public;
      }
      if (comment) {
        if (!Dam.allCharacterPrintable(comment)) {
          throw new BadRequestError('comment contains invalid invisible character');
        }
        comment = comment.normalize('NFC');
        if (comment.length > 380) {
          throw new BadRequestError('comment too long');
        }
        if (dam.needReview(comment) || auth.permission.ban_post) {
          privacy = CollectionPrivacy.Ban;
        }
      }
      tags = tags?.map((t) => t.trim().normalize('NFKC'));
      if (tags !== undefined) {
        if (tags.length > 10) {
          throw new BadRequestError('too many tags');
        }
        if (dam.needReview(tags.join(' '))) {
          tags = undefined;
        } else {
          for (const tag of tags) {
            if (tag.length < 2) {
              throw new BadRequestError('tag too short');
            }
          }
          // 插入 tag 并生成 tag 字符串
          // tags = TagCore::insertTagsNeue($uid, $_POST['tags'], TagCore::TAG_CAT_SUBJECT, $subject['subject_type_id'], $subject['subject_id']);
        }
      }

      await rateLimit(LimitAction.Subject, auth.userID);

      let interestTypeUpdated = false;
      await db.transaction(async (t) => {
        let needUpdateRate = false;

        const [subject] = await t
          .select()
          .from(schema.chiiSubjects)
          .where(op.eq(schema.chiiSubjects.id, subjectID))
          .limit(1);
        if (!subject) {
          throw new UnexpectedNotFoundError(`subject ${subjectID}`);
        }
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
        let oldRate = 0;
        if (rate !== undefined) {
          rate = 0;
        }
        if (interest) {
          oldRate = interest.rate;
          const oldType = interest.type;
          const oldPrivacy = interest.privacy;
          if (privacy === undefined) {
            privacy = oldPrivacy;
          }
          const toUpdate: Partial<orm.ISubjectInterest> = {};
          if (type && oldType !== type) {
            interestTypeUpdated = true;
            const now = DateTime.now().toUnixInteger();
            toUpdate.type = type;
            toUpdate.updatedAt = now;
            toUpdate[`${getCollectionTypeField(type)}Dateline`] = now;
            //若收藏类型改变,则更新数据
            await t
              .update(schema.chiiSubjects)
              .set({
                [getCollectionTypeField(type)]: incr(
                  schema.chiiSubjects[getCollectionTypeField(type)],
                ),
                [getCollectionTypeField(oldType)]: decr(
                  schema.chiiSubjects[getCollectionTypeField(oldType)],
                ),
              })
              .where(op.eq(schema.chiiSubjects.id, subjectID))
              .limit(1);
          }
          if (oldRate !== rate) {
            needUpdateRate = true;
            toUpdate.rate = rate;
          }
          if (comment !== undefined) {
            toUpdate.comment = comment;
          }
          if (oldPrivacy !== privacy) {
            needUpdateRate = true;
            toUpdate.privacy = privacy;
          }
          if (tags !== undefined) {
            toUpdate.tag = tags.join(' ');
          }
          if (Object.keys(toUpdate).length > 0) {
            await t
              .update(schema.chiiSubjectInterests)
              .set(toUpdate)
              .where(
                op.and(
                  op.eq(schema.chiiSubjectInterests.uid, auth.userID),
                  op.eq(schema.chiiSubjectInterests.subjectID, subjectID),
                ),
              )
              .limit(1);
          }
        } else {
          if (!type) {
            throw new BadRequestError('type is required on new subject interest');
          }
          if (privacy === undefined) {
            privacy = CollectionPrivacy.Public;
          }
          const now = DateTime.now().toUnixInteger();
          const toInsert: typeof schema.chiiSubjectInterests.$inferInsert = {
            uid: auth.userID,
            subjectID,
            subjectType: slimSubject.type,
            rate,
            type,
            hasComment: comment ? 1 : 0,
            comment: comment ?? '',
            tag: tags?.join(' ') ?? '',
            epStatus: 0,
            volStatus: 0,
            wishDateline: 0,
            doingDateline: 0,
            collectDateline: 0,
            onHoldDateline: 0,
            droppedDateline: 0,
            createIp: auth.ip,
            updateIp: auth.ip,
            updatedAt: now,
            privacy,
          };
          const field = getCollectionTypeField(type);
          toInsert[`${field}Dateline`] = now;
          await t.insert(schema.chiiSubjectInterests).values(toInsert);
          interestTypeUpdated = true;
          if (rate) {
            needUpdateRate = true;
          }
          // 收藏计数＋1
          if (type) {
            await t
              .update(schema.chiiSubjects)
              .set({
                [field]: incr(schema.chiiSubjects[field]),
              })
              .where(op.eq(schema.chiiSubjects.id, subjectID))
              .limit(1);
          }
        }

        // 更新评分
        if (needUpdateRate) {
          await updateSubjectRating(t, subjectID, oldRate, rate ?? 0);
        }
      });

      // 插入时间线
      if (privacy === CollectionPrivacy.Public && interestTypeUpdated) {
        try {
          await TimelineWriter.subject(auth.userID, subjectID);
        } catch (error) {
          logger.error(`failed to write timeline for subject ${subjectID}`, {
            error,
            userID: auth.userID,
          });
        }
      }
    },
  );

  app.get(
    '/collections/characters',
    {
      schema: {
        summary: '获取当前用户的角色收藏',
        operationId: 'getMyCharacterCollections',
        tags: [Tag.Collection],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.Character)),
        },
      },
      preHandler: [requireLogin('get my character collections')],
    },
    async ({ auth, query: { limit = 20, offset = 0 } }) => {
      const conditions = op.and(
        op.eq(schema.chiiPersonCollects.cat, PersonType.Character),
        op.eq(schema.chiiPersonCollects.uid, auth.userID),
        op.ne(schema.chiiCharacters.ban, 1),
        op.eq(schema.chiiCharacters.redirect, 0),
        auth.allowNsfw ? undefined : op.eq(schema.chiiCharacters.nsfw, false),
      );

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiPersonCollects)
        .innerJoin(
          schema.chiiCharacters,
          op.eq(schema.chiiPersonCollects.mid, schema.chiiCharacters.id),
        )
        .where(conditions);

      const data = await db
        .select()
        .from(schema.chiiPersonCollects)
        .innerJoin(
          schema.chiiCharacters,
          op.eq(schema.chiiPersonCollects.mid, schema.chiiCharacters.id),
        )
        .where(conditions)
        .orderBy(op.desc(schema.chiiPersonCollects.createdAt))
        .limit(limit)
        .offset(offset);
      const collection = data.map((d) => {
        const character = convert.toCharacter(d.chii_characters);
        return {
          ...character,
          collectedAt: d.chii_person_collects.createdAt,
        };
      });

      return {
        data: collection,
        total: count,
      };
    },
  );

  app.get(
    '/collections/persons',
    {
      schema: {
        summary: '获取当前用户的人物收藏',
        operationId: 'getMyPersonCollections',
        tags: [Tag.Collection],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.Person)),
        },
      },
      preHandler: [requireLogin('get my person collections')],
    },
    async ({ auth, query: { limit = 20, offset = 0 } }) => {
      const conditions = op.and(
        op.eq(schema.chiiPersonCollects.cat, PersonType.Person),
        op.eq(schema.chiiPersonCollects.uid, auth.userID),
        op.ne(schema.chiiPersons.ban, 1),
        op.eq(schema.chiiPersons.redirect, 0),
        auth.allowNsfw ? undefined : op.eq(schema.chiiPersons.nsfw, false),
      );

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiPersonCollects)
        .innerJoin(schema.chiiPersons, op.eq(schema.chiiPersonCollects.mid, schema.chiiPersons.id))
        .where(conditions);

      const data = await db
        .select()
        .from(schema.chiiPersonCollects)
        .innerJoin(schema.chiiPersons, op.eq(schema.chiiPersonCollects.mid, schema.chiiPersons.id))
        .where(conditions)
        .orderBy(op.desc(schema.chiiPersonCollects.createdAt))
        .limit(limit)
        .offset(offset);
      const collection = data.map((d) => {
        const person = convert.toPerson(d.chii_persons);
        return {
          ...person,
          collectedAt: d.chii_person_collects.createdAt,
        };
      });

      return {
        data: collection,
        total: count,
      };
    },
  );

  app.get(
    '/collections/indexes',
    {
      schema: {
        summary: '获取当前用户的目录收藏',
        operationId: 'getMyIndexCollections',
        tags: [Tag.Collection],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.Index)),
        },
      },
      preHandler: [requireLogin('get my index collections')],
    },
    async ({ auth, query: { limit = 20, offset = 0 } }) => {
      const conditions = op.and(
        op.eq(schema.chiiIndexCollects.uid, auth.userID),
        op.ne(schema.chiiIndexes.ban, 1),
      );

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiIndexCollects)
        .innerJoin(schema.chiiIndexes, op.eq(schema.chiiIndexCollects.mid, schema.chiiIndexes.id))
        .where(conditions);

      const data = await db
        .select()
        .from(schema.chiiIndexCollects)
        .innerJoin(schema.chiiIndexes, op.eq(schema.chiiIndexCollects.mid, schema.chiiIndexes.id))
        .where(conditions)
        .orderBy(op.desc(schema.chiiIndexCollects.createdAt))
        .limit(limit)
        .offset(offset);
      const collection = data.map((d) => {
        const index = convert.toIndex(d.chii_index);
        return {
          ...index,
          collectedAt: d.chii_index_collects.createdAt,
        };
      });

      return {
        data: collection,
        total: count,
      };
    },
  );
}
