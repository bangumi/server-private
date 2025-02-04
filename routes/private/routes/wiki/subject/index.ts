import { parseToMap } from '@bgm38/wiki';
import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import { StatusCodes } from 'http-status-codes';
import { DateTime } from 'luxon';
import type { ResultSetHeader } from 'mysql2';

import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema.ts';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { BadRequestError, NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import * as entity from '@app/lib/orm/entity';
import { RevType } from '@app/lib/orm/entity';
import { AppDataSource, SubjectRevRepo } from '@app/lib/orm/index.ts';
import * as orm from '@app/lib/orm/index.ts';
import { pushRev } from '@app/lib/rev/ep.ts';
import * as Subject from '@app/lib/subject/index.ts';
import { InvalidWikiSyntaxError } from '@app/lib/subject/index.ts';
import { SubjectType, SubjectTypeValues } from '@app/lib/subject/type.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import { matchExpected } from '@app/lib/wiki';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';
import { getSubjectPlatforms } from '@app/vendor/index.ts';

import * as epRoutes from './ep.ts';
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
    nsfw: t.Boolean(),
    metaTags: t.Array(t.String()),
    summary: t.String(),
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
        name: t.String({ minLength: 1 }),
        infobox: t.String({ minLength: 1 }),
        platform: t.Integer(),
        metaTags: t.Array(t.String()),
      },
      {
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
    nsfw: t.Boolean(),
  },
  { $id: 'SubjectWikiInfo' },
);

const EpisodePartial = t.Partial(t.Omit(epRoutes.EpisodeWikiInfo, ['id', 'subjectID']));

export const EpsisodesNew = t.Object(
  {
    episodes: t.Array(
      // EpisodePartial with required ep
      t.Composite([t.Omit(EpisodePartial, ['ep']), t.Object({ ep: t.Number() })]),
    ),
  },
  { $id: 'EpsisodesNew' },
);

export const EpsisodesEdit = t.Object(
  {
    commitMessage: t.String(),
    episodes: t.Array(
      // EpisodePartial with required id
      t.Composite([EpisodePartial, t.Object({ id: t.Integer() })]),
    ),
    expectedRevision: t.Optional(t.Array(epRoutes.EpisodeExpected)),
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
        description: ['获取当前的 wiki 信息'].join('\n\n'),
        params: t.Object({
          subjectID: t.Integer({ examples: [363612], minimum: 0 }),
        }),
        security: [{ [Security.CookiesSession]: [] }],
        response: {
          200: req.Ref(SubjectWikiInfo),
          401: req.Ref(res.Error, {
            'x-examples': formatErrors(new InvalidWikiSyntaxError()),
          }),
        },
      },
    },
    async ({ params: { subjectID } }): Promise<Static<typeof SubjectWikiInfo>> => {
      const s = await orm.fetchSubjectByID(subjectID);
      if (!s) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      if (s.locked) {
        throw new NotAllowedError('edit a locked subject');
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
        description: '创建新条目',
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: SubjectNew,
        response: {
          200: t.Object({ subjectID: t.Number() }),
          [StatusCodes.BAD_REQUEST]: res.Ref(res.Error, {
            'x-examples': formatErrors(new InvalidWikiSyntaxError()),
          }),
          401: res.Ref(res.Error, {}),
        },
      },
    },
    async ({ auth, body }) => {
      if (!auth.permission.subject_edit) {
        throw new NotAllowedError('edit subject');
      }

      if (!SubjectTypeValues.has(body.type)) {
        throw new BadRequestError(`条目类型错误`);
      }

      const platforms = getSubjectPlatforms(body.type);
      if (!(body.platform in platforms)) {
        throw new BadRequestError(`条目分类错误`);
      }

      let w;
      try {
        w = parseToMap(body.infobox);
      } catch (error) {
        throw new BadRequestError(`infobox 包含语法错误 ${error}`);
      }

      let eps = 0;
      if (body.type === SubjectType.Anime) {
        eps = Number.parseInt((w.data.get('话数') as string) ?? '0') || 0;
      } else if (body.type === SubjectType.Real) {
        eps = Number.parseInt((w.data.get('集数') as string) ?? '0') || 0;
      }

      const newSubject: Partial<entity.Subject> = {
        name: body.name,
        nameCN: (w.data.get('中文名') as string) ?? '',
        platform: body.platform,
        fieldInfobox: body.infobox,
        typeID: body.type,
        metaTags: body.metaTags.sort().join(' '),
        fieldSummary: body.summary,
        subjectNsfw: body.nsfw,
        fieldEps: eps,
        updatedAt: DateTime.now().toUnixInteger(),
      };

      const subjectID = await AppDataSource.transaction(async (txn) => {
        const s = await txn
          .getRepository(entity.Subject)
          .createQueryBuilder()
          .insert()
          .values(newSubject)
          .execute();

        const r = s.raw as ResultSetHeader;

        await txn
          .getRepository(entity.SubjectFields)
          .createQueryBuilder()
          .insert()
          .values({ subjectID: r.insertId })
          .execute();

        if (eps) {
          // avoid create too many episodes, 50 is enough.
          eps = Math.min(eps, 50);

          const episodes = Array.from({ length: eps })
            .fill(null)
            .map((_, index) => {
              return {
                subjectID: r.insertId,
                sort: index + 1,
                type: 0,
              };
            });

          await txn
            .getRepository(entity.Episode)
            .createQueryBuilder()
            .insert()
            .values(episodes)
            .execute();
        }

        await txn
          .getRepository(entity.SubjectRev)
          .createQueryBuilder()
          .insert()
          .values({
            subjectID: r.insertId,
            type: RevType.subjectEdit,
            name: newSubject.name,
            nameCN: newSubject.nameCN,
            infobox: newSubject.fieldInfobox,
            metaTags: newSubject.metaTags,
            summary: newSubject.fieldSummary,
            createdAt: newSubject.updatedAt,
            typeID: newSubject.typeID,
            platform: newSubject.platform,
            eps: eps,
            creatorID: auth.userID,
          })
          .execute();

        return r.insertId;
      });

      return { subjectID };
    },
  );

  type IHistorySummary = Static<typeof HistorySummary>;
  const HistorySummary = t.Object(
    {
      creator: t.Object({
        username: t.String(),
      }),
      type: t.Integer({
        description: '修改类型。`1` 正常修改， `11` 合并，`103` 锁定/解锁 `104` 未知',
      }),
      commitMessage: t.String(),
      createdAt: t.Integer({ description: 'unix timestamp seconds' }),
    },
    { $id: 'HistorySummary' },
  );

  app.addSchema(HistorySummary);

  app.get(
    '/subjects/:subjectID/history-summary',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'subjectEditHistorySummary',
        description: ['获取当前的 wiki 信息'].join('\n\n'),
        params: t.Object({
          subjectID: t.Integer({ examples: [8], minimum: 0 }),
        }),
        security: [{ [Security.CookiesSession]: [] }],
        response: {
          200: t.Array(res.Ref(HistorySummary)),
          401: res.Ref(res.Error, {
            'x-examples': formatErrors(new InvalidWikiSyntaxError()),
          }),
        },
      },
    },
    async ({ params: { subjectID } }): Promise<IHistorySummary[]> => {
      const history = await SubjectRevRepo.find({
        take: 10,
        order: { id: 'desc' },
        where: { subjectID },
      });

      if (history.length === 0) {
        return [];
      }

      const users = await orm.fetchUsers(history.map((x) => x.creatorID));

      return history.map((x) => {
        const u = users[x.creatorID];

        return {
          creator: {
            username: u?.username ?? '',
          },
          type: x.type,
          createdAt: x.createdAt,
          commitMessage: x.commitMessage,
        } satisfies IHistorySummary;
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
          subjectID: t.Integer({ examples: [363612], minimum: 0 }),
        }),
        security: [{ [Security.CookiesSession]: [] }],
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

      const s = await fetcher.fetchSlimSubjectByID(subjectID);
      if (!s) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      if (s.locked) {
        throw new NotAllowedError('edit a locked subject');
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
          subjectID: t.Integer({ examples: [363612], minimum: 0 }),
        }),
        security: [{ [Security.CookiesSession]: [] }],
        body: t.Object(
          {
            commitMessage: t.String({ minLength: 1 }),
            expectedRevision: SubjectExpected,
            subject: t.Partial(SubjectEdit, { $id: undefined }),
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
      body: { commitMessage, subject: input, expectedRevision },
      params: { subjectID },
    }): Promise<void> => {
      if (!auth.permission.subject_edit) {
        throw new NotAllowedError('edit subject');
      }

      if (Object.keys(input).length === 0) {
        return;
      }

      const s = await orm.fetchSubjectByID(subjectID);
      if (!s) {
        throw new BadRequestError(`subject ${subjectID}`);
      }

      if (s.locked) {
        throw new NotAllowedError('edit a locked subject');
      }

      const {
        infobox = s.infobox,
        name = s.name,
        platform = s.platform,
        metaTags = s.metaTags ? s.metaTags.split(' ') : [],
        summary = s.summary,
        nsfw = s.nsfw,
        date,
      }: Partial<Static<typeof SubjectEdit>> = input;

      if (
        infobox === s.infobox &&
        name === s.name &&
        platform === s.platform &&
        metaTags.sort().join(' ') === s.metaTags &&
        summary === s.summary &&
        nsfw === s.nsfw &&
        date === undefined
      ) {
        // no new data
        return;
      }

      await Subject.edit({
        subjectID: subjectID,
        name: name,
        infobox: infobox,
        commitMessage: commitMessage,
        platform: platform,
        metaTags: metaTags,
        summary: summary,
        nsfw,
        date,
        userID: auth.userID,
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
          subjectID: t.Integer({ examples: [363612], minimum: 0 }),
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
        throw new NotAllowedError('edit a locked subject');
      }

      const now = DateTime.now().toUnixInteger();
      const discDefault = s.type === SubjectType.Music ? 1 : 0;
      const newEpisodes = episodes.map((ep) => {
        epRoutes.validateDateDuration(ep.date, ep.duration);
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
      await db.transaction(async (txn) => {
        const eps = await txn
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
            matchExpected(ep, expectedRevision[index]);
          }

          epRoutes.validateDateDuration(epEdit.date, epEdit.duration);
          if (epEdit.date !== undefined) {
            ep.airdate = epEdit.date;
          }
          if (epEdit.duration !== undefined) {
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
          await txn.update(schema.chiiEpisodes).set(ep).where(op.eq(schema.chiiEpisodes.id, ep.id));
        }
        await pushRev(txn, {
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
}
