import { parseToMap } from '@bgm38/wiki';
import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import { StatusCodes } from 'http-status-codes';
import { DateTime } from 'luxon';
import type { ResultSetHeader } from 'mysql2';

import { NotAllowedError } from '@app/lib/auth/index.ts';
import { BadRequestError, NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import * as entity from '@app/lib/orm/entity';
import { RevType } from '@app/lib/orm/entity';
import { AppDataSource, SubjectRevRepo } from '@app/lib/orm/index.ts';
import * as orm from '@app/lib/orm/index.ts';
import * as Subject from '@app/lib/subject/index.ts';
import { InvalidWikiSyntaxError, platforms, SubjectType } from '@app/lib/subject/index.ts';
import PlatformConfig from '@app/lib/subject/platform.ts';
import { SubjectTypeValues } from '@app/lib/subject/type.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

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
    type: t.Enum(SubjectType),
    platform: t.Integer(),
    infobox: t.String({ minLength: 1 }),
    nsfw: t.Boolean(),
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
    typeID: t.Ref(res.SubjectType),
    infobox: t.String(),
    platform: t.Integer(),
    availablePlatform: t.Array(t.Ref(Platform)),
    summary: t.String(),
    nsfw: t.Boolean(),
  },
  { $id: 'SubjectWikiInfo' },
);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  imageRoutes.setup(app);
  manageRoutes.setup(app);
  app.addSchema(res.Error);
  app.addSchema(SubjectEdit);
  app.addSchema(Platform);
  app.addSchema(res.SubjectType);
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
          200: t.Ref(SubjectWikiInfo),
          401: t.Ref(res.Error, {
            'x-examples': formatErrors(InvalidWikiSyntaxError()),
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

      return {
        id: s.id,
        name: s.name,
        infobox: s.infobox,
        summary: s.summary,
        platform: s.platform,
        availablePlatform: platforms(s.typeID).map((x) => ({
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
          [StatusCodes.BAD_REQUEST]: t.Ref(res.Error, {
            'x-examples': formatErrors(InvalidWikiSyntaxError()),
          }),
          401: t.Ref(res.Error, {}),
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

      if (!(body.platform in PlatformConfig[body.type])) {
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
        eps = Number.parseInt(w.data.get('话数')?.value ?? '0') || 0;
      } else if (body.type === SubjectType.Real) {
        eps = Number.parseInt(w.data.get('集数')?.value ?? '0') || 0;
      }

      const newSubject: Partial<entity.Subject> = {
        name: body.name,
        nameCN: w.data.get('中文名')?.value ?? '',
        platform: body.platform,
        fieldInfobox: body.infobox,
        typeID: body.type,
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
          200: t.Array(t.Ref(HistorySummary)),
          401: t.Ref(res.Error, {
            'x-examples': formatErrors(InvalidWikiSyntaxError()),
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
            subject: t.Ref(SubjectEdit),
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
          401: t.Ref(res.Error, {
            'x-examples': formatErrors(InvalidWikiSyntaxError()),
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

      const s = await orm.fetchSubjectByID(subjectID);
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
        summary: body.summary,
        nsfw: body.nsfw,
        userID: auth.userID,
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
          401: t.Ref(res.Error, {
            'x-examples': formatErrors(InvalidWikiSyntaxError()),
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
        summary = s.summary,
        nsfw = s.nsfw,
        date,
      }: Partial<Static<typeof SubjectEdit>> = input;

      if (
        infobox === s.infobox &&
        name === s.name &&
        platform === s.platform &&
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
        summary: summary,
        nsfw,
        date,
        userID: auth.userID,
        expectedRevision,
      });
    },
  );
}
