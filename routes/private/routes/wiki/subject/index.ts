import { StatusCodes } from 'http-status-codes';
import { DateTime } from 'luxon';
import type { Static } from 'typebox';
import t from 'typebox';

import { db, op, schema } from '@app/drizzle';
import { HeaderInvalidError, NotAllowedError } from '@app/lib/auth/index.ts';
import config from '@app/lib/config.ts';
import { BadRequestError, LockedError, NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { pushRev } from '@app/lib/rev/ep.ts';
import * as Subject from '@app/lib/subject/index.ts';
import { InvalidWikiSyntaxError } from '@app/lib/subject/index.ts';
import { SubjectType } from '@app/lib/subject/type.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import { validateDate } from '@app/lib/utils/date.ts';
import { validateDuration } from '@app/lib/utils/index.ts';
import { matchExpected } from '@app/lib/wiki';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';
import { getSubjectPlatforms } from '@app/vendor/index.ts';

import * as imageRoutes from './image.ts';
import * as manageRoutes from './mgr.ts';

const exampleSubjectEdit = {
  name: '沙盒',
  infobox: `{{Infobox animanga/TVAnime
|中文名= 沙盒
|别名={
}
|话数= 7
|放送开始= 0000-10-06
|放送星期= 
|官方网站= 
|播放电视台= 
|其他电视台= 
|播放结束= 
|其他= 
|Copyright= 
|平台={
[龟壳]
[Xbox Series S]
[Xbox Series X]
[Xbox Series X/S]
[PC]
[Xbox Series X|S]
}
}}`,
  platform: 0,
  nsfw: false,
  summary: `本条目是一个沙盒，可以用于尝试bgm功能。

普通维基人可以随意编辑条目信息以及相关关联查看编辑效果，但是请不要完全删除沙盒说明并且不要关联非沙盒条目/人物/角色。

https://bgm.tv/group/topic/366812#post_1923517`,
};

export type ISubjectNew = Static<typeof SubjectNew>;
export const SubjectNew = t.Object(
  {
    name: t.String({ minLength: 1 }),
    type: res.Ref(res.SubjectType),
    platform: t.Integer(),
    infobox: t.String({ minLength: 1 }),
    series: t.Optional(t.Boolean()),
    nsfw: t.Boolean(),
    metaTags: t.Array(t.String()),
    summary: t.String(),
    date: t.Optional(
      t.String({
        pattern: String.raw`^\d{4}-\d{2}-\d{2}$`,
        examples: ['0000-00-00', '2007-01-30'],
      }),
    ),
  },
  {
    $id: 'SubjectNew',
  },
);

export type ISubjectEdit = Static<typeof SubjectEdit>;
export const SubjectEdit = t.Object(
  {
    name: t.String({ minLength: 1 }),
    infobox: t.String({ minLength: 1 }),
    platform: t.Integer(),
    series: t.Optional(t.Boolean()),
    nsfw: t.Boolean(),
    date: t.Optional(
      t.String({
        pattern: String.raw`^\d{4}-\d{2}-\d{2}$`,
        examples: ['0000-00-00', '2007-01-30'],
      }),
    ),
    metaTags: t.Array(t.String()),
    summary: t.String(),
  },
  {
    examples: [exampleSubjectEdit],
    $id: 'SubjectEdit',
  },
);

const SubjectExpected = t.Optional(
  t.Partial(
    t.Object(
      {
        name: t.Union([t.Null(), t.String({ minLength: 1 })]),
        infobox: t.Union([t.Null(), t.String({ minLength: 1 })]),
        platform: t.Union([t.Null(), t.Integer()]),
        summary: t.Union([t.Null(), t.String({ minLength: 1 })]),
        metaTags: t.Union([t.Null(), t.Array(t.String())]),
      },
      {
        additionalProperties: false,
        description:
          "a optional object to check if input is changed by others\nif `infobox` is given, and current data in database doesn't match input, subject will not be changed",
      },
    ),
  ),
);

const Platform = t.Object(
  {
    id: t.Integer(),
    text: t.String(),
    wiki_tpl: t.Optional(t.String()),
  },
  { $id: 'WikiPlatform' },
);

export const SubjectWikiInfo = t.Object(
  {
    id: t.Integer(),
    name: t.String(),
    typeID: res.Ref(res.SubjectType),
    infobox: t.String(),
    platform: t.Integer(),
    availablePlatform: t.Array(res.Ref(Platform)),
    metaTags: t.Array(t.String()),
    summary: t.String(),
    series: t.Optional(t.Boolean()),
    nsfw: t.Boolean(),
  },
  { $id: 'SubjectWikiInfo' },
);

const EpisodePartial = t.Partial(t.Omit(req.EpisodeWikiInfo, ['id', 'subjectID']));

export const EpsisodesNew = t.Object(
  {
    episodes: t.Array(
      // EpisodePartial with required ep
      t.Interface([t.Omit(EpisodePartial, ['ep']), t.Object({ ep: t.Number() })], {}),
    ),
  },
  { $id: 'EpsisodesNew' },
);

export const EpsisodesEdit = t.Object(
  {
    commitMessage: t.String(),
    episodes: t.Array(
      // EpisodePartial with required id
      t.Interface([EpisodePartial, t.Object({ id: t.Integer() })], {}),
    ),
    expectedRevision: t.Optional(t.Array(req.EpisodeExpected)),
  },
  { $id: 'EpsisodesEdit' },
);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  imageRoutes.setup(app);
  manageRoutes.setup(app);
  app.addSchema(SubjectEdit);
  app.addSchema(Platform);
  app.addSchema(SubjectWikiInfo);

  app.get(
    '/subjects/:subjectID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'subjectInfo',
        summary: '获取条目当前的 wiki 信息',
        params: t.Object({
          subjectID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: req.Ref(SubjectWikiInfo),
          401: req.Ref(res.Error, {
            'x-examples': formatErrors(new InvalidWikiSyntaxError()),
          }),
          404: req.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('subject')),
          }),
        },
      },
    },
    async ({ params: { subjectID } }): Promise<Static<typeof SubjectWikiInfo>> => {
      const [s] = await db
        .select()
        .from(schema.chiiSubjects)
        .where(op.eq(schema.chiiSubjects.id, subjectID))
        .limit(1);

      if (!s) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      const [f] = await db
        .select()
        .from(schema.chiiSubjectFields)
        .where(op.eq(schema.chiiSubjectFields.id, subjectID))
        .limit(1);

      if (!f) {
        throw new NotFoundError(`subject field ${subjectID}`);
      }

      if (s.ban === 2 || f.redirect) {
        throw new LockedError();
      }

      const availablePlatforms = getSubjectPlatforms(s.typeID);

      return {
        id: s.id,
        name: s.name,
        infobox: s.infobox,
        metaTags: s.metaTags ? s.metaTags.split(' ') : [],
        summary: s.summary,
        platform: s.platform,
        availablePlatform: availablePlatforms.map((x) => ({
          id: x.id,
          text: x.type_cn,
          wiki_tpl: x.wiki_tpl,
        })),
        ...(s.typeID === SubjectType.Book && { series: s.series }),
        nsfw: s.nsfw,
        typeID: s.typeID,
      };
    },
  );

  app.addSchema(SubjectNew);

  app.post(
    '/subjects',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'createNewSubject',
        summary: '创建新条目',
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: t.Object({
          commitMessage: t.String({ minLength: 1 }),
          subject: req.Ref(SubjectNew),
        }),
        response: {
          200: t.Object({ subjectID: t.Number() }),
          [StatusCodes.BAD_REQUEST]: res.Ref(res.Error, {
            'x-examples': formatErrors(new InvalidWikiSyntaxError()),
          }),
          401: res.Ref(res.Error, {}),
        },
      },
    },
    async ({ auth, body: { commitMessage, subject: input } }) => {
      if (!auth.permission.subject_edit) {
        throw new NotAllowedError('edit subject');
      }

      const body: Static<typeof SubjectNew> = input;

      const subjectID = await Subject.create({
        typeID: body.type,
        name: body.name,
        infobox: body.infobox,
        platform: body.platform,
        date: body.date,
        metaTags: body.metaTags,
        summary: body.summary,
        series: body.series,
        nsfw: body.nsfw,
        userID: auth.userID,
        now: DateTime.now(),
        commitMessage,
      });

      return { subjectID };
    },
  );

  const SubjectRevisionWikiInfo = t.Object(
    {
      id: t.Integer(),
      name: t.String(),
      infobox: t.String(),
      metaTags: t.Array(t.String()),
      summary: t.String(),
    },
    { $id: 'SubjectRevisionWikiInfo' },
  );
  app.addSchema(SubjectRevisionWikiInfo);

  app.get(
    '/subjects/-/revisions/:revisionID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getSubjectRevisionInfo',
        summary: '获取条目历史版本 wiki 信息',
        params: t.Object({
          revisionID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: req.Ref(SubjectRevisionWikiInfo),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('revision')),
          }),
        },
      },
    },
    async ({ params: { revisionID } }): Promise<Static<typeof SubjectRevisionWikiInfo>> => {
      const [r] = await db
        .select()
        .from(schema.chiiSubjectRev)
        .where(op.eq(schema.chiiSubjectRev.revId, revisionID));
      if (!r) {
        throw new NotFoundError(`revision ${revisionID}`);
      }

      return {
        id: r.subjectID,
        name: r.name,
        infobox: r.infobox,
        metaTags: r.metaTags ? r.metaTags.split(' ') : [],
        summary: r.summary,
      };
    },
  );

  app.get(
    '/subjects/:subjectID/history-summary',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'subjectEditHistorySummary',
        summary: '获取条目 wiki 历史编辑摘要',
        params: t.Object({
          subjectID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: t.Array(res.Ref(res.RevisionHistory)),
          401: res.Ref(res.Error, {
            'x-examples': formatErrors(new InvalidWikiSyntaxError()),
          }),
        },
      },
    },
    async ({ params: { subjectID } }) => {
      const history = await db
        .select()
        .from(schema.chiiSubjectRev)
        .where(op.eq(schema.chiiSubjectRev.subjectID, subjectID))
        .orderBy(op.desc(schema.chiiSubjectRev.revId))
        .limit(10);

      if (history.length === 0) {
        return [];
      }

      const users = await fetcher.fetchSlimUsersByIDs(history.map((x) => x.creatorID));

      return history.map((x) => {
        return {
          id: x.revId,
          creator: {
            username: users[x.creatorID]?.username ?? '',
          },
          type: x.type,
          createdAt: x.createdAt,
          commitMessage: x.commitMessage,
        } satisfies res.IRevisionHistory;
      });
    },
  );

  app.put(
    '/subjects/:subjectID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'putSubjectInfo',
        description: '需要 `subjectWikiEdit` 权限',
        params: t.Object({
          subjectID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: t.Object(
          {
            commitMessage: t.String({ minLength: 1 }),
            expectedRevision: SubjectExpected,
            subject: req.Ref(SubjectEdit),
          },
          {
            examples: [
              {
                commitMessage: '修正笔误',
                subject: exampleSubjectEdit,
              },
            ],
          },
        ),
        response: {
          200: t.Null(),
          401: res.Ref(res.Error, {
            'x-examples': formatErrors(new InvalidWikiSyntaxError()),
          }),
        },
      },
      preHandler: [requireLogin('editing a subject info')],
    },
    async ({
      auth,
      body: { commitMessage, subject: input, expectedRevision },
      params: { subjectID },
    }): Promise<void> => {
      if (!auth.permission.subject_edit) {
        throw new NotAllowedError('edit subject');
      }

      const [s] = await db
        .select()
        .from(schema.chiiSubjects)
        .where(op.eq(schema.chiiSubjects.id, subjectID))
        .limit(1);

      if (!s) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      const [f] = await db
        .select()
        .from(schema.chiiSubjectFields)
        .where(op.eq(schema.chiiSubjectFields.id, subjectID))
        .limit(1);

      if (!f) {
        throw new NotFoundError(`subject field ${subjectID}`);
      }

      if (s.ban === 2 || f.redirect) {
        throw new LockedError();
      }

      const body: Static<typeof SubjectEdit> = input;

      await Subject.edit({
        subjectID: subjectID,
        name: body.name,
        infobox: body.infobox,
        platform: body.platform,
        date: body.date,
        metaTags: body.metaTags,
        summary: body.summary,
        series: body.series,
        nsfw: body.nsfw,
        userID: auth.userID,
        now: DateTime.now(),
        commitMessage,
        expectedRevision,
      });
    },
  );

  app.patch(
    '/subjects/:subjectID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'patchSubjectInfo',
        params: t.Object({
          subjectID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: t.Object(
          {
            commitMessage: t.String({ minLength: 1 }),
            expectedRevision: SubjectExpected,
            subject: t.Partial(SubjectEdit, { $id: undefined }),
            authorID: t.Optional(
              t.Integer({
                exclusiveMinimum: 0,
                description: 'when header x-admin-token is provided, use this as author id.',
              }),
            ),
          },
          {
            examples: [
              {
                commitMessage: '修正笔误',
                subject: { infobox: exampleSubjectEdit.infobox },
              },
            ],
          },
        ),
        response: {
          200: t.Null(),
          401: res.Ref(res.Error, {
            'x-examples': formatErrors(new InvalidWikiSyntaxError()),
          }),
        },
      },
      preHandler: [requireLogin('editing a subject info')],
    },
    async ({
      auth,
      headers,
      body: { commitMessage, subject: input, expectedRevision, authorID },
      params: { subjectID },
    }): Promise<void> => {
      if (!auth.permission.subject_edit) {
        throw new NotAllowedError('edit subject');
      }

      if (Object.keys(input).length === 0) {
        return;
      }

      const [s] = await db
        .select()
        .from(schema.chiiSubjects)
        .where(op.eq(schema.chiiSubjects.id, subjectID))
        .limit(1);

      if (!s) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      const [f] = await db
        .select()
        .from(schema.chiiSubjectFields)
        .where(op.eq(schema.chiiSubjectFields.id, subjectID))
        .limit(1);

      if (!f) {
        throw new NotFoundError(`subject field ${subjectID}`);
      }

      if (s.ban === 2 || f.redirect) {
        throw new LockedError();
      }

      const {
        infobox = s.infobox,
        name = s.name,
        platform = s.platform,
        metaTags = s.metaTags ? s.metaTags.split(' ') : [],
        summary = s.summary,
        series = s.series,
        nsfw = s.nsfw,
        date,
      }: Partial<Static<typeof SubjectEdit>> = input;

      if (
        infobox === s.infobox &&
        name === s.name &&
        platform === s.platform &&
        metaTags.toSorted().join(' ') === s.metaTags &&
        summary === s.summary &&
        series === s.series &&
        nsfw === s.nsfw &&
        date === undefined
      ) {
        // no new data
        return;
      }

      let finalAuthorID = auth.userID;
      const adminToken = headers['x-admin-token'];
      if (adminToken !== undefined) {
        if (adminToken !== config.admin_token) {
          throw new HeaderInvalidError('invalid admin token');
        }

        if (authorID) {
          if (!(await fetcher.fetchSlimUserByID(authorID))) {
            throw new BadRequestError(`user ${authorID} does not exists`);
          }
          finalAuthorID = authorID;
        }
      }

      await Subject.edit({
        subjectID: subjectID,
        name: name,
        infobox: infobox,
        commitMessage: commitMessage,
        platform: platform,
        metaTags: metaTags,
        summary: summary,
        series,
        nsfw,
        date,
        userID: finalAuthorID,
        now: DateTime.now(),
        expectedRevision,
      });
    },
  );

  app.addSchema(EpsisodesNew);

  app.post(
    '/subjects/:subjectID/ep',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'createEpisodes',
        summary: '为条目添加新章节',
        description: '需要 `epEdit` 权限，一次最多可以添加 40 个章节',
        params: t.Object({
          subjectID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: EpsisodesNew,
        response: {
          200: t.Object({ episodeIDs: t.Array(t.Integer()) }),
          401: res.Ref(res.Error, {
            'x-examples': formatErrors(new InvalidWikiSyntaxError()),
          }),
        },
      },
      preHandler: [requireLogin('creating episodes')],
    },
    async ({
      auth,
      body: { episodes },
      params: { subjectID },
    }): Promise<{ episodeIDs: number[] }> => {
      if (!auth.permission.ep_edit) {
        throw new NotAllowedError('create episodes');
      }

      if (episodes.length === 0) {
        return { episodeIDs: [] };
      }
      if (episodes.length > 40) {
        throw new BadRequestError('too many episodes, max is 40');
      }

      const s = await fetcher.fetchSlimSubjectByID(subjectID);
      if (!s) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      if (s.locked) {
        throw new LockedError();
      }

      const now = DateTime.now().toUnixInteger();
      const discDefault = s.type === SubjectType.Music ? 1 : 0;
      const newEpisodes = episodes.map((ep) => {
        validateDate(ep.date);
        validateDuration(ep.duration);
        return {
          subjectID: subjectID,
          sort: ep.ep,
          type: ep.type ?? 0,
          disc: ep.disc ?? discDefault,
          name: ep.name ?? '',
          nameCN: ep.nameCN ?? '',
          rate: 0,
          duration: ep.duration ?? '',
          airdate: ep.date ?? '',
          online: '',
          comment: 0,
          resources: 0,
          desc: ep.summary ?? '',
          createdAt: now,
          updatedAt: now,
        };
      });

      const episodeIDs = await db.transaction(async (txn) => {
        const [{ insertId: firstEpID }] = await txn.insert(schema.chiiEpisodes).values(newEpisodes);

        await pushRev(txn, {
          revisions: newEpisodes.map((ep, i) => ({
            episodeID: firstEpID + i,
            rev: {
              ep_sort: ep.sort.toString(),
              ep_type: ep.type.toString(),
              ep_disc: ep.disc.toString(),
              ep_name: ep.name,
              ep_name_cn: ep.nameCN,
              ep_duration: ep.duration,
              ep_airdate: ep.airdate,
              ep_desc: ep.desc,
            },
          })),
          creator: auth.userID,
          now,
          comment: '新章节',
        });
        return Array.from({ length: newEpisodes.length }, (_, i) => firstEpID + i);
      });

      return { episodeIDs };
    },
  );

  app.addSchema(EpsisodesEdit);

  app.patch(
    '/subjects/:subjectID/ep',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'patchEpisodes',
        summary: '批量编辑条目章节',
        description: '需要 `epEdit` 权限，一次最多可以编辑 20 个章节',
        params: t.Object({ subjectID: t.Integer({ examples: [363612], minimum: 0 }) }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: EpsisodesEdit,
        response: {
          200: t.Null(),
          401: res.Ref(res.Error, {
            'x-examples': formatErrors(new InvalidWikiSyntaxError()),
          }),
        },
      },
      preHandler: [requireLogin('editing episodes')],
    },
    async ({
      auth,
      body: { commitMessage, episodes: episodeEdits, expectedRevision },
      params: { subjectID },
    }): Promise<void> => {
      if (!auth.permission.ep_edit) {
        throw new NotAllowedError('edit episodes');
      }

      const s = await fetcher.fetchSlimSubjectByID(subjectID);
      if (!s) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      if (s.locked) {
        throw new NotAllowedError('edit a locked subject');
      }

      if (episodeEdits.length === 0) {
        throw new BadRequestError('no episodes to edit');
      }
      if (episodeEdits.length > 20) {
        throw new BadRequestError('too many episodes, max is 20');
      }
      if (expectedRevision && expectedRevision.length !== episodeEdits.length) {
        throw new BadRequestError('expected revision length is not equal to episodes length');
      }

      const episodeIDs = episodeEdits.map((ep) => ep.id);
      if (episodeIDs.length !== new Set(episodeIDs).size) {
        throw new BadRequestError('episode ids are not unique');
      }
      await db.transaction(async (t) => {
        const eps = await t
          .select()
          .from(schema.chiiEpisodes)
          .where(op.inArray(schema.chiiEpisodes.id, episodeIDs));
        const epsMap = new Map(eps.map((ep) => [ep.id, ep]));

        const now = DateTime.now().toUnixInteger();
        for (const [index, epEdit] of episodeEdits.entries()) {
          const ep = epsMap.get(epEdit.id);
          if (!ep) {
            throw new BadRequestError(`episode ${epEdit.id} not found`);
          }
          if (ep.subjectID !== subjectID) {
            throw new BadRequestError(`episode ${epEdit.id} is not for subject ${subjectID}`);
          }
          if (expectedRevision?.[index] !== undefined) {
            matchExpected(expectedRevision[index], {
              name: ep.name,
              nameCN: ep.nameCN,
              duration: ep.duration,
              date: ep.airdate,
              summary: ep.desc,
            });
          }

          if (epEdit.date !== undefined) {
            validateDate(epEdit.date);
            ep.airdate = epEdit.date;
          }
          if (epEdit.duration !== undefined) {
            validateDuration(epEdit.duration);
            ep.duration = epEdit.duration;
          }

          if (epEdit.name !== undefined) {
            ep.name = epEdit.name;
          }

          if (epEdit.nameCN !== undefined) {
            ep.nameCN = epEdit.nameCN;
          }

          if (epEdit.summary !== undefined) {
            ep.desc = epEdit.summary;
          }

          if (epEdit.ep !== undefined) {
            ep.sort = epEdit.ep;
          }

          if (epEdit.disc !== undefined) {
            ep.disc = epEdit.disc;
          }

          if (epEdit.type !== undefined) {
            ep.type = epEdit.type;
          }

          ep.updatedAt = now;
        }

        for (const ep of eps) {
          await t.update(schema.chiiEpisodes).set(ep).where(op.eq(schema.chiiEpisodes.id, ep.id));
        }
        await pushRev(t, {
          revisions: eps.map((ep) => ({
            episodeID: ep.id,
            rev: {
              ep_sort: ep.sort.toString(),
              ep_type: ep.type.toString(),
              ep_disc: ep.disc.toString(),
              ep_name: ep.name,
              ep_name_cn: ep.nameCN,
              ep_duration: ep.duration,
              ep_airdate: ep.airdate,
              ep_desc: ep.desc,
            },
          })),
          creator: auth.userID,
          now,
          comment: commitMessage,
        });
      });
    },
  );

  type IUserSubjectContribution = Static<typeof UserSubjectContribution>;
  const UserSubjectContribution = t.Object(
    {
      id: t.Integer(),
      type: t.Integer({
        description: '修改类型。`1` 正常修改， `11` 合并，`103` 锁定/解锁 `104` 未知',
      }),
      subjectID: t.Integer(),
      name: t.String(),
      commitMessage: t.String(),
      createdAt: t.Integer({ description: 'unix timestamp seconds' }),
    },
    { $id: 'UserSubjectContribution' },
  );

  app.addSchema(UserSubjectContribution);

  app.get(
    '/users/:username/contributions/subjects',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getUserContributedSubjects',
        summary: '获取用户 wiki 条目编辑记录',
        params: t.Object({
          username: t.String(),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.Paged(res.Ref(UserSubjectContribution)),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('user')),
          }),
        },
      },
    },
    async ({ params: { username }, query: { limit = 20, offset = 0 } }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count(schema.chiiSubjectRev.subjectID) })
        .from(schema.chiiSubjectRev)
        .where(op.eq(schema.chiiSubjectRev.creatorID, user.id));

      const history = await db
        .select()
        .from(schema.chiiSubjectRev)
        .where(op.eq(schema.chiiSubjectRev.creatorID, user.id))
        .orderBy(op.desc(schema.chiiSubjectRev.revId))
        .offset(offset)
        .limit(limit);

      const revisions = history.map((r) => {
        return {
          id: r.revId,
          type: r.type,
          subjectID: r.subjectID,
          name: r.name,
          commitMessage: r.commitMessage,
          createdAt: r.createdAt,
        } satisfies IUserSubjectContribution;
      });

      return {
        total: count,
        data: revisions,
      };
    },
  );
}
