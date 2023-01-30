import * as crypto from 'node:crypto';

import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { NotAllowedError } from '@app/lib/auth';
import { BadRequestError, NotFoundError } from '@app/lib/error';
import { fileExtension, SupportedImageExtension, uploadSubjectImage } from '@app/lib/image';
import { Security, Tag } from '@app/lib/openapi';
import { SubjectRevRepo } from '@app/lib/orm';
import * as orm from '@app/lib/orm';
import { requireLogin, requirePermission } from '@app/lib/rest/hooks/pre-handler';
import type { App } from '@app/lib/rest/type';
import imaginary from '@app/lib/services/imaginary';
import * as Subject from '@app/lib/subject';
import { InvalidWikiSyntaxError, platforms, SandBox } from '@app/lib/subject';
import * as res from '@app/lib/types/res';
import { formatErrors } from '@app/lib/types/res';

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
        description: [
          '获取当前的 wiki 信息',
          `暂时只能修改沙盒条目 ${[...SandBox].sort().join(', ')}`,
        ].join('\n\n'),
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
      const s = await orm.fetchSubject(subjectID);
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
        description: [
          '获取当前的 wiki 信息',
          `暂时只能修改沙盒条目 ${[...SandBox].sort().join(', ')}`,
        ].join('\n\n'),
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
        description: `暂时只能修改沙盒条目 ${[...SandBox].sort().join(',')}`,
        params: t.Object({
          subjectID: t.Integer({ examples: [363612], minimum: 0 }),
        }),
        security: [{ [Security.CookiesSession]: [] }],
        body: t.Object(
          {
            commitMessage: t.String({ minLength: 1 }),
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
      body: { commitMessage, subject: input },
      params: { subjectID },
    }): Promise<void> => {
      if (!auth.permission.subject_edit) {
        throw new NotAllowedError('edit subject');
      }

      const s = await orm.fetchSubject(subjectID);
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
      });
    },
  );

  app.post(
    '/subjects/:subjectID/cover',
    {
      schema: {
        operationId: 'uploadSubjectCover',
        params: t.Object({
          subjectID: t.Integer(),
        }),
        body: t.Object({
          content: t.String({
            format: 'byte',
            description: 'base64 encoded raw bytes, 4mb size limit on **decoded** size',
          }),
        }),
      },
      preHandler: [
        requireLogin('upload a subject cover'),
        requirePermission('upload subject cover', (auth) => auth.permission.subject_edit ?? false),
      ],
    },
    async ({ body: { content }, auth, params: { subjectID } }) => {
      const raw = Buffer.from(content, 'base64');
      // 4mb
      if (raw.length > 4 * 1024 * 1024) {
        throw new BadRequestError('file too large');
      }

      // validate image
      const res = await imaginary.info(raw);
      const format = res.type;

      if (!format) {
        throw new BadRequestError("not valid image, can' get image format");
      }

      const ext = fileExtension(format);
      if (!ext) {
        throw new BadRequestError(
          `not valid image, only support ${SupportedImageExtension.join(', ')}`,
        );
      }

      const h = crypto.createHash('blake2b512').update(raw).digest('base64url').slice(0, 32);

      const filename = `-/${h.slice(0, 2)}/${h.slice(2, 4)}/${subjectID}_${h.slice(4)}.${ext}`;

      const s = await orm.fetchSubject(subjectID);
      if (!s) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      if (s.locked) {
        throw new NotAllowedError('edit a locked subject');
      }
      if (s.redirect) {
        throw new NotAllowedError('edit a locked subject');
      }

      await uploadSubjectImage(filename, raw);

      await Subject.uploadCover({ subjectID: subjectID, filename, uid: auth.userID });

      return subjectID;
    },
  );

  app.patch(
    '/subjects/:subjectID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'patchSubjectInfo',
        description: `暂时只能修改沙盒条目 ${[...SandBox].sort().join(',')}`,
        params: t.Object({
          subjectID: t.Integer({ examples: [363612], minimum: 0 }),
        }),
        security: [{ [Security.CookiesSession]: [] }],
        body: t.Object(
          {
            commitMessage: t.String({ minLength: 1 }),
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
      body: { commitMessage, subject: input },
      params: { subjectID },
    }): Promise<void> => {
      if (!auth.permission.subject_edit) {
        throw new NotAllowedError('edit subject');
      }

      if (Object.keys(input).length === 0) {
        return;
      }

      const s = await orm.fetchSubject(subjectID);
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
      });
    },
  );
}
