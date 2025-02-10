import { Type as t } from '@sinclair/typebox';
import { DateTime } from 'luxon';

import { db, op } from '@app/drizzle/db.ts';
import type * as orm from '@app/drizzle/orm.ts';
import * as schema from '@app/drizzle/schema';
import { Dam, dam } from '@app/lib/dam';
import { BadRequestError, NotFoundError, UnexpectedNotFoundError } from '@app/lib/error';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import {
  CollectionPrivacy,
  getCollectionTypeField,
  PersonType,
  SubjectType,
} from '@app/lib/subject/type.ts';
import {
  markEpisodesAsWatched,
  updateSubjectCollection,
  updateSubjectRating,
} from '@app/lib/subject/utils.ts';
import { insertUserSubjectTags } from '@app/lib/tag';
import { AsyncTimelineWriter } from '@app/lib/timeline/writer.ts';
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
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('update subject progress')],
    },
    async ({ ip, auth, params: { subjectID }, body: { epStatus, volStatus } }) => {
      const subject = await fetcher.fetchSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
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

      await db.transaction(async (t) => {
        const toUpdate: Partial<orm.ISubjectInterest> = {};
        switch (subject.type) {
          case SubjectType.Anime:
          case SubjectType.Real: {
            if (epStatus === undefined) {
              break;
            }
            toUpdate.epStatus = epStatus;
            const episodes = await t
              .select({ id: schema.chiiEpisodes.id })
              .from(schema.chiiEpisodes)
              .where(
                op.and(
                  op.eq(schema.chiiEpisodes.subjectID, subjectID),
                  // 只更新 main 类型的剧集
                  op.eq(schema.chiiEpisodes.type, 0),
                  op.eq(schema.chiiEpisodes.ban, 0),
                ),
              )
              .orderBy(op.asc(schema.chiiEpisodes.type), op.asc(schema.chiiEpisodes.sort))
              .limit(epStatus);
            const episodeIDs = episodes.map((e) => e.id);
            if (episodeIDs.length === 0) {
              break;
            }
            await markEpisodesAsWatched(t, auth.userID, subjectID, episodeIDs);
            break;
          }
          case SubjectType.Book: {
            if (epStatus !== undefined) {
              toUpdate.epStatus = epStatus;
            }
            if (volStatus !== undefined) {
              toUpdate.volStatus = volStatus;
            }
            break;
          }
          default: {
            throw new BadRequestError(`subject not supported for progress`);
          }
        }

        if (Object.keys(toUpdate).length === 0) {
          throw new BadRequestError('no update');
        }
        toUpdate.updatedAt = DateTime.now().toUnixInteger();
        toUpdate.updateIp = ip;
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
      });

      await AsyncTimelineWriter.progressSubject({
        uid: auth.userID,
        subject: {
          id: subject.id,
          type: subject.type,
          eps: subject.eps,
          volumes: subject.volumes,
        },
        collect: {
          epsUpdate: epStatus,
          volsUpdate: volStatus,
        },
        createdAt: DateTime.now().toUnixInteger(),
      });
      return {};
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
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('update subject collection')],
    },
    async ({
      ip,
      auth,
      params: { subjectID },
      body: { type, rate, comment, private: priv, tags },
    }) => {
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

      await rateLimit(LimitAction.Subject, auth.userID);

      let needTimeline = false;
      let interestID = 0;
      await db.transaction(async (t) => {
        let needUpdateRate = false;

        if (tags !== undefined) {
          tags = await insertUserSubjectTags(t, auth.userID, subjectID, slimSubject.type, tags);
        }

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
          interestID = interest.id;
          oldRate = interest.rate;
          const oldType = interest.type;
          const oldPrivacy = interest.privacy;
          if (privacy === undefined) {
            privacy = oldPrivacy;
          }
          const toUpdate: Partial<orm.ISubjectInterest> = {};
          if (type && oldType !== type) {
            needTimeline = true;
            const now = DateTime.now().toUnixInteger();
            toUpdate.type = type;
            toUpdate.updatedAt = now;
            toUpdate.updateIp = ip;
            toUpdate[`${getCollectionTypeField(type)}Dateline`] = now;
            //若收藏类型改变,则更新数据
            await updateSubjectCollection(t, subjectID, type, oldType);
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
            createIp: ip,
            updateIp: ip,
            updatedAt: now,
            privacy,
          };
          const field = getCollectionTypeField(type);
          toInsert[`${field}Dateline`] = now;
          const [result] = await t.insert(schema.chiiSubjectInterests).values(toInsert);
          interestID = result.insertId;
          needTimeline = true;
          if (rate) {
            needUpdateRate = true;
          }
          if (type) {
            // 收藏计数＋1
            await updateSubjectCollection(t, subjectID, type);
          }
        }

        // 更新评分
        if (needUpdateRate) {
          await updateSubjectRating(t, subjectID, oldRate, rate ?? 0);
        }
      });

      // 插入时间线
      if (privacy === CollectionPrivacy.Public && needTimeline && type) {
        await AsyncTimelineWriter.subject({
          uid: auth.userID,
          subject: {
            id: slimSubject.id,
            type: slimSubject.type,
          },
          collect: {
            id: interestID,
            type,
            rate: rate ?? 0,
            comment: comment ?? '',
          },
          createdAt: DateTime.now().toUnixInteger(),
        });
      }
      return {};
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
