import * as crypto from 'node:crypto';

import type { Wiki } from '@bgm38/wiki';
import { parse, WikiSyntaxError } from '@bgm38/wiki';
import { DateTime } from 'luxon';
import type { Static } from 'typebox';
import t from 'typebox';

import { db, op, schema } from '@app/drizzle';
import { HeaderInvalidError } from '@app/lib/auth/index.ts';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import config from '@app/lib/config.ts';
import { BadRequestError, LockedError, NotFoundError } from '@app/lib/error.ts';
import {
  ImageFileTooLarge,
  ImageTypeCanBeUploaded,
  sizeLimit,
  UnsupportedImageFormat,
  uploadMonoImage,
} from '@app/lib/image/index.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { createRevision } from '@app/lib/rev/common.ts';
import type { ICharacterRev } from '@app/lib/rev/type.ts';
import { CharacterCastRev, CharacterRev, CharacterSubjectRev, RevType } from '@app/lib/rev/type.ts';
import { deserializeRevText } from '@app/lib/rev/utils.ts';
import imaginary from '@app/lib/services/imaginary.ts';
import { InvalidWikiSyntaxError } from '@app/lib/subject/index.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import { ghostUser } from '@app/lib/user/utils';
import { parseConvertedValue } from '@app/lib/utils/index.ts';
import {
  extractBirth,
  extractBloodType,
  extractGender,
  matchExpected,
  WikiChangedError,
} from '@app/lib/wiki.ts';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

type IUserCharacterContribution = Static<typeof UserCharacterContribution>;
const UserCharacterContribution = t.Object(
  {
    id: t.Integer(),
    type: t.Integer({
      description: '2 = 角色编辑',
    }),
    characterID: t.Integer(),
    name: t.String(),
    commitMessage: t.String(),
    createdAt: t.Integer({ description: 'unix timestamp seconds' }),
  },
  { $id: 'UserCharacterContribution' },
);
export type IPagedUserCharacterContribution = Static<typeof PagedUserCharacterContribution>;
const PagedUserCharacterContribution = res.Paged(res.Ref(UserCharacterContribution));

type ICharacterSubjectRevisionWikiInfo = Static<typeof CharacterSubjectRevisionWikiInfo>;
export const CharacterSubjectRevisionWikiInfo = t.Array(
  t.Object({
    subject: t.Object({
      id: t.Integer(),
      typeID: res.Ref(res.SubjectType),
      name: t.String(),
      nameCN: t.String(),
    }),
    type: t.Integer(),
    order: t.Integer(),
  }),
  {
    $id: 'CharacterSubjectRevisionWikiInfo',
  },
);

type ICharacterCastRevisionWikiInfo = Static<typeof CharacterCastRevisionWikiInfo>;
export const CharacterCastRevisionWikiInfo = t.Array(
  t.Object({
    subject: t.Object({
      id: t.Integer(),
      typeID: res.Ref(res.SubjectType),
      name: t.String(),
      nameCN: t.String(),
    }),
    person: t.Object({
      id: t.Integer(),
      name: t.String(),
      nameCN: t.String(),
    }),
  }),
  {
    $id: 'CharacterCastRevisionWikiInfo',
  },
);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(UserCharacterContribution);
  app.addSchema(CharacterSubjectRevisionWikiInfo);
  app.addSchema(CharacterCastRevisionWikiInfo);

  app.get(
    '/characters/:characterID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getCharacterWikiInfo',
        summary: '获取角色当前的 wiki 信息',
        params: t.Object({
          characterID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.Ref(res.CharacterWikiInfo),
          401: res.Ref(res.Error, {
            'x-examples': formatErrors(new InvalidWikiSyntaxError()),
          }),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('character')),
          }),
        },
      },
    },
    async ({ params: { characterID } }): Promise<res.ICharacterWikiInfo> => {
      const [c] = await db
        .select()
        .from(schema.chiiCharacters)
        .where(op.eq(schema.chiiCharacters.id, characterID))
        .limit(1);
      if (!c) {
        throw new NotFoundError(`character ${characterID}`);
      }

      return {
        id: c.id,
        name: c.name,
        infobox: c.infobox,
        summary: c.summary,
        locked: Boolean(c.ban),
        redirect: c.redirect,
      };
    },
  );

  app.post(
    '/characters',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'postCharacterInfo',
        summary: '创建角色',
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: t.Object({
          character: req.CharacterCreate,
          authorID: t.Optional(
            t.Integer({
              exclusiveMinimum: 0,
              description: 'when header x-admin-token is provided, use this as author id.',
            }),
          ),
        }),
        response: {
          200: t.Object({ characterID: t.Integer() }),
          400: res.Ref(res.Error, {
            'x-examples': formatErrors(
              new WikiChangedError(`Index: name
===================================================================
--- name	expected
+++ name	current
@@ -1,1 +1,1 @@
-1234
+水樹奈々
`),
            ),
          }),
          401: res.Ref(res.Error, {
            'x-examples': formatErrors(new InvalidWikiSyntaxError()),
          }),
        },
      },
      preHandler: [requireLogin('creating a character')],
    },
    async ({ auth, headers, body: { character, authorID } }) => {
      const adminToken = headers['x-admin-token'];
      if (authorID !== undefined && adminToken !== config.admin_token) {
        throw new HeaderInvalidError('invalid admin token');
      }

      if (!auth.permission.mono_edit) {
        throw new NotAllowedError('edit character');
      }

      let finalAuthorID = auth.userID;
      if (authorID !== undefined) {
        if (!(await fetcher.fetchSlimUserByID(authorID))) {
          throw new BadRequestError(`user ${authorID} does not exist`);
        }
        finalAuthorID = authorID;
      }

      let wiki: Wiki;
      try {
        wiki = parse(character.infobox);
      } catch (error) {
        if (error instanceof WikiSyntaxError) {
          let l = '';
          if (error.line) {
            l = `line: ${error.line}`;
            if (error.lino) {
              l += `:${error.lino}`;
            }
          }

          if (l) {
            l = ' (' + l + ')';
          }

          throw new InvalidWikiSyntaxError(`${error.message}${l}`);
        }

        throw error;
      }

      let characterID;

      await db.transaction(async (t) => {
        const now = DateTime.now().toUnixInteger();
        const [{ insertId }] = await t.insert(schema.chiiCharacters).values({
          name: character.name,
          role: character.type,
          infobox: character.infobox,
          summary: character.summary,
          img: '',
          comment: 0,
          collects: 0,
          createdAt: now,
          lastPost: 0,
          lock: 0,
          anidbImg: '',
          anidbId: 0,
          nsfw: false,
        } satisfies typeof schema.chiiCharacters.$inferInsert);

        characterID = insertId;

        let filename, raw;
        if (character.img) {
          raw = Buffer.from(character.img, 'base64');
          // 4mb
          if (raw.length > sizeLimit) {
            throw new ImageFileTooLarge();
          }

          // validate image
          const resp = await imaginary.info(raw);
          const format = resp.type;

          if (!format) {
            throw new UnsupportedImageFormat();
          }

          if (!ImageTypeCanBeUploaded.includes(format)) {
            throw new UnsupportedImageFormat();
          }

          // convert webp to jpeg
          let ext = format;
          if (format === 'webp') {
            raw = await imaginary.convert(raw, { format: 'jpeg' });
            if (raw.length > sizeLimit) {
              throw new ImageFileTooLarge();
            }
            ext = 'jpeg';
          }

          // for example "36b8f84d-df4e-4d49-b662-bcde71a8764f"
          const h = crypto.randomUUID();

          // for example raw/36/b8/${character_id}_crt_f84d-df4e-4d49-b662-bcde71a8764f.jpg"
          filename = `raw/${h.slice(0, 2)}/${h.slice(2, 4)}/${characterID}_crt_${h}.${ext}`;
        }

        await t
          .update(schema.chiiCharacters)
          .set({
            img: filename ?? '',
          })
          .where(op.eq(schema.chiiCharacters.id, characterID))
          .limit(1);

        const { year, month, day } = extractBirth(wiki);
        await t.insert(schema.chiiPersonFields).values({
          prsnCat: 'crt',
          prsnId: characterID,
          gender: extractGender(wiki),
          bloodtype: extractBloodType(wiki),
          birthYear: year,
          birthMon: month,
          birthDay: day,
        } satisfies typeof schema.chiiPersonFields.$inferInsert);

        await createRevision(t, {
          mid: characterID,
          type: RevType.characterEdit,
          rev: {
            crt_name: character.name,
            crt_infobox: character.infobox,
            crt_summary: character.summary,
            extra: {
              img: filename ?? '',
            },
          } satisfies ICharacterRev,
          creator: finalAuthorID,
          comment: '新条目',
        });

        if (filename && raw) {
          await uploadMonoImage(filename, raw);
        }
      });

      if (characterID) {
        return { characterID };
      } else {
        throw new Error('unknown error');
      }
    },
  );

  app.patch(
    '/characters/:characterID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'patchCharacterInfo',
        summary: '编辑角色',
        params: t.Object({
          characterID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: t.Object(
          {
            commitMessage: t.String({ minLength: 1 }),
            expectedRevision: t.Partial(
              t.Object({
                name: t.String({ minLength: 1 }),
                infobox: t.String({ minLength: 1 }),
                summary: t.String(),
              }),
              {
                default: {},
                additionalProperties: false,
              },
            ),
            character: t.Partial(req.CharacterEdit, { additionalProperties: false }),
            authorID: t.Optional(
              t.Integer({
                exclusiveMinimum: 0,
                description: 'when header x-admin-token is provided, use this as author id.',
              }),
            ),
          },
          { additionalProperties: false },
        ),
        response: {
          200: t.Object({}),
          400: res.Ref(res.Error, {
            'x-examples': formatErrors(
              new WikiChangedError(`Index: name
===================================================================
--- name	expected
+++ name	current
@@ -1,1 +1,1 @@
-1234
+水樹奈々
`),
            ),
          }),
          401: res.Ref(res.Error, {
            'x-examples': formatErrors(new InvalidWikiSyntaxError()),
          }),
          ...res.errorResponses(
            ImageFileTooLarge(),
            UnsupportedImageFormat(),
            new NotAllowedError('non sandbox subject'),
          ),
        },
      },
      preHandler: [requireLogin('editing a character')],
    },
    async ({
      auth,
      headers,
      body: { commitMessage, character: input, expectedRevision, authorID },
      params: { characterID },
    }) => {
      const adminToken = headers['x-admin-token'];
      if (authorID !== undefined && adminToken !== config.admin_token) {
        throw new HeaderInvalidError('invalid admin token');
      }

      if (!auth.permission.mono_edit) {
        throw new NotAllowedError('edit character');
      }

      let wiki: Wiki;
      if (input.infobox) {
        try {
          wiki = parse(input.infobox);
        } catch (error) {
          if (error instanceof WikiSyntaxError) {
            let l = '';
            if (error.line) {
              l = `line: ${error.line}`;
              if (error.lino) {
                l += `:${error.lino}`;
              }
            }

            if (l) {
              l = ' (' + l + ')';
            }

            throw new InvalidWikiSyntaxError(`${error.message}${l}`);
          }

          throw error;
        }
      }

      let finalAuthorID = auth.userID;
      if (authorID !== undefined) {
        if (!(await fetcher.fetchSlimUserByID(authorID))) {
          throw new BadRequestError(`user ${authorID} does not exist`);
        }
        finalAuthorID = authorID;
      }

      await db.transaction(async (t) => {
        const [p] = await t
          .select()
          .from(schema.chiiCharacters)
          .where(op.eq(schema.chiiCharacters.id, characterID))
          .limit(1);

        if (!p) {
          throw new NotFoundError(`character ${characterID}`);
        }
        if (p.lock || p.redirect) {
          throw new LockedError();
        }

        matchExpected(expectedRevision, { name: p.name, infobox: p.infobox, summary: p.summary });

        const updated = {
          infobox: input.infobox ?? p.infobox,
          name: input.name ?? p.name,
          summary: input.summary ?? p.summary,
        };

        await t
          .update(schema.chiiCharacters)
          .set(updated)
          .where(op.eq(schema.chiiCharacters.id, characterID))
          .limit(1);

        if (wiki) {
          const { year, month, day } = extractBirth(wiki);
          await t
            .update(schema.chiiPersonFields)
            .set({
              gender: extractGender(wiki),
              bloodtype: extractBloodType(wiki),
              birthYear: year,
              birthMon: month,
              birthDay: day,
            })
            .where(
              op.and(
                op.eq(schema.chiiPersonFields.prsnCat, 'crt'),
                op.eq(schema.chiiPersonFields.prsnId, characterID),
              ),
            )
            .limit(1);
        }

        await createRevision(t, {
          mid: characterID,
          type: RevType.characterEdit,
          rev: {
            crt_name: updated.name,
            crt_infobox: updated.infobox,
            crt_summary: updated.summary,
            extra: {
              img: p.img,
            },
          } satisfies ICharacterRev,
          creator: finalAuthorID,
          comment: commitMessage,
        });
      });

      return {};
    },
  );

  app.post(
    '/characters/:characterID/potraits',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'uploadCharacterPotrait',
        summary: '上传角色肖像',
        params: t.Object({
          characterID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: t.Object(
          {
            img: t.String({
              format: 'byte',
              description: 'base64 encoded raw bytes, 4mb size limit on **decoded** size',
            }),
            authorID: t.Optional(
              t.Integer({
                exclusiveMinimum: 0,
                description: 'when header x-admin-token is provided, use this as author id.',
              }),
            ),
          },
          { additionalProperties: false },
        ),
        response: {
          200: t.Object({
            img: t.String({ description: 'image filename' }),
          }),
          ...res.errorResponses(
            ImageFileTooLarge(),
            UnsupportedImageFormat(),
            new NotAllowedError('edit character'),
          ),
        },
      },
      preHandler: [requireLogin('uploading image')],
    },
    async ({ auth, headers, body: { img: base64Img, authorID }, params: { characterID } }) => {
      const adminToken = headers['x-admin-token'];
      if (authorID !== undefined && adminToken !== config.admin_token) {
        throw new HeaderInvalidError('invalid admin token');
      }

      if (!auth.permission.mono_edit) {
        throw new NotAllowedError('edit character');
      }

      let finalAuthorID = auth.userID;
      if (authorID !== undefined) {
        if (!(await fetcher.fetchSlimUserByID(authorID))) {
          throw new BadRequestError(`user ${authorID} does not exist`);
        }
        finalAuthorID = authorID;
      }

      const [p] = await db
        .select()
        .from(schema.chiiCharacters)
        .where(op.eq(schema.chiiCharacters.id, characterID))
        .limit(1);

      if (!p) {
        throw new NotFoundError(`character ${characterID}`);
      }

      let raw = Buffer.from(base64Img, 'base64');
      // 4mb
      if (raw.length > sizeLimit) {
        throw new ImageFileTooLarge();
      }

      // validate image
      const resp = await imaginary.info(raw);
      const format = resp.type;

      if (!format) {
        throw new UnsupportedImageFormat();
      }

      if (!ImageTypeCanBeUploaded.includes(format)) {
        throw new UnsupportedImageFormat();
      }

      // convert webp to jpeg
      let ext = format;
      if (format === 'webp') {
        raw = await imaginary.convert(raw, { format: 'jpeg' });
        if (raw.length > sizeLimit) {
          throw new ImageFileTooLarge();
        }
        ext = 'jpeg';
      }

      // for example "36b8f84d-df4e-4d49-b662-bcde71a8764f"
      const h = crypto.randomUUID();

      // for example raw/36/b8/${character_id}_crt_36b8f84d-df4e-4d49-b662-bcde71a8764f.jpg"
      const filename = `raw/${h.slice(0, 2)}/${h.slice(2, 4)}/${characterID}_crt_${h}.${ext}`;

      await db.transaction(async (t) => {
        await t
          .update(schema.chiiCharacters)
          .set({ img: filename })
          .where(op.eq(schema.chiiCharacters.id, characterID))
          .limit(1);

        await createRevision(t, {
          mid: characterID,
          type: RevType.characterEdit,
          rev: {
            crt_name: p.name,
            crt_infobox: p.infobox,
            crt_summary: p.summary,
            extra: {
              img: filename,
            },
          } satisfies ICharacterRev,
          creator: finalAuthorID,
          comment: '新肖像',
        });

        await uploadMonoImage(filename, raw);
      });

      return { img: filename };
    },
  );

  app.get(
    '/characters/:characterID/history-summary',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'characterEditHistorySummary',
        summary: '获取角色 wiki 历史编辑摘要',
        params: t.Object({
          characterID: t.Integer({ minimum: 1 }),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.PagedRevisionHistory,
        },
      },
    },
    async ({ params: { characterID }, query: { limit = 20, offset = 0 } }) => {
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.eq(schema.chiiRevHistory.revMid, characterID),
            op.inArray(schema.chiiRevHistory.revType, [RevType.characterEdit]),
          ),
        );

      const history = await db
        .select()
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.eq(schema.chiiRevHistory.revMid, characterID),
            op.inArray(schema.chiiRevHistory.revType, [RevType.characterEdit]),
          ),
        )
        .orderBy(op.desc(schema.chiiRevHistory.revId))
        .offset(offset)
        .limit(limit);

      const users = await fetcher.fetchSlimUsersByIDs(history.map((x) => x.revCreator));
      const revisions = history.map((x) => {
        return {
          id: x.revId,
          creator: {
            username: users[x.revCreator]?.username ?? ghostUser(x.revCreator).username,
            nickname: users[x.revCreator]?.nickname ?? ghostUser(x.revCreator).nickname,
          },
          type: x.revType,
          createdAt: x.createdAt,
          commitMessage: x.revEditSummary,
        } satisfies res.IRevisionHistory;
      });

      return {
        total: count,
        data: revisions,
      };
    },
  );

  app.get(
    '/characters/-/revisions/:revisionID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getCharacterRevisionInfo',
        summary: '获取角色历史版本 wiki 信息',
        params: t.Object({
          revisionID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.Ref(res.CharacterRevisionWikiInfo),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('revision')),
          }),
        },
      },
    },
    async ({ params: { revisionID } }): Promise<res.ICharacterRevisionWikiInfo> => {
      const [r] = await db
        .select()
        .from(schema.chiiRevHistory)
        .where(op.eq(schema.chiiRevHistory.revId, revisionID))
        .limit(1);
      if (!r || r.revType !== RevType.characterEdit) {
        throw new NotFoundError(`revision ${revisionID}`);
      }

      const [revText] = await db
        .select()
        .from(schema.chiiRevText)
        .where(op.eq(schema.chiiRevText.revTextId, r.revTextId))
        .limit(1);
      if (!revText) {
        throw new NotFoundError(`RevText ${r.revTextId}`);
      }

      const revRecord = await deserializeRevText(revText.revText);
      const revContentRaw = revRecord[revisionID];
      const revContent = parseConvertedValue(CharacterRev, revContentRaw);

      return {
        name: revContent.crt_name,
        infobox: revContent.crt_infobox,
        summary: revContent.crt_summary,
        extra: revContent.extra,
      };
    },
  );

  app.get(
    '/characters/:characterID/subjects/history-summary',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'characterSubjectHistorySummary',
        summary: '获取角色-条目关联 wiki 历史编辑摘要',
        params: t.Object({
          characterID: t.Integer({ minimum: 1 }),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.PagedRevisionHistory,
        },
      },
    },
    async ({ params: { characterID }, query: { limit = 20, offset = 0 } }) => {
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.eq(schema.chiiRevHistory.revMid, characterID),
            op.eq(schema.chiiRevHistory.revType, RevType.characterSubjectRelation),
          ),
        );

      const history = await db
        .select()
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.eq(schema.chiiRevHistory.revMid, characterID),
            op.eq(schema.chiiRevHistory.revType, RevType.characterSubjectRelation),
          ),
        )
        .orderBy(op.desc(schema.chiiRevHistory.revId))
        .offset(offset)
        .limit(limit);

      const users = await fetcher.fetchSlimUsersByIDs(history.map((x) => x.revCreator));

      const revisions = history.map((x) => {
        return {
          id: x.revId,
          creator: {
            username: users[x.revCreator]?.username ?? ghostUser(x.revCreator).username,
            nickname: users[x.revCreator]?.nickname ?? ghostUser(x.revCreator).nickname,
          },
          type: x.revType,
          createdAt: x.createdAt,
          commitMessage: x.revEditSummary,
        } satisfies res.IRevisionHistory;
      });

      return {
        total: count,
        data: revisions,
      };
    },
  );

  app.get(
    '/characters/-/subjects/revisions/:revisionID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getCharacterSubjectRevisionInfo',
        summary: '获取角色-条目关联历史版本 wiki 信息',
        params: t.Object({
          revisionID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.Ref(CharacterSubjectRevisionWikiInfo),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('revision')),
          }),
        },
      },
    },
    async ({ params: { revisionID } }): Promise<ICharacterSubjectRevisionWikiInfo> => {
      const [r] = await db
        .select()
        .from(schema.chiiRevHistory)
        .where(op.eq(schema.chiiRevHistory.revId, revisionID))
        .limit(1);
      if (!r || r.revType !== RevType.characterSubjectRelation) {
        throw new NotFoundError(`revision ${revisionID}`);
      }

      const [revText] = await db
        .select()
        .from(schema.chiiRevText)
        .where(op.eq(schema.chiiRevText.revTextId, r.revTextId))
        .limit(1);
      if (!revText) {
        throw new NotFoundError(`RevText ${r.revTextId}`);
      }

      const revRecord = await deserializeRevText(revText.revText);
      const revContentRaw = revRecord[revisionID];
      const revContent = parseConvertedValue(CharacterSubjectRev, revContentRaw);
      const rels = Object.values(revContent);
      const subjectIDs = rels.map((rel) => rel.subject_id);
      const subjectsMap: Record<
        number,
        {
          id: number;
          type: number;
          name: string;
          nameCN: string;
        }
      > = {};
      const data = await db
        .select()
        .from(schema.chiiSubjects)
        .where(op.inArray(schema.chiiSubjects.id, subjectIDs));
      for (const d of data) {
        subjectsMap[d.id] = {
          id: d.id,
          type: d.typeID,
          name: d.name,
          nameCN: d.nameCN,
        };
      }

      const relations = rels.flatMap((rel) => {
        const subjectID = rel.subject_id;
        const subject = subjectsMap[subjectID];
        if (!subject) return [];

        return [
          {
            subject: {
              id: subjectID,
              typeID: subject.type,
              name: subject.name,
              nameCN: subject.nameCN,
            },
            type: rel.crt_type,
            order: rel.crt_order,
          },
        ];
      });

      return relations;
    },
  );

  app.get(
    '/characters/:characterID/casts/history-summary',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'characterCastHistorySummary',
        summary: '获取角色-人物关联 wiki 历史编辑摘要',
        params: t.Object({
          characterID: t.Integer({ minimum: 1 }),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.PagedRevisionHistory,
        },
      },
    },
    async ({ params: { characterID }, query: { limit = 20, offset = 0 } }) => {
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.eq(schema.chiiRevHistory.revMid, characterID),
            op.eq(schema.chiiRevHistory.revType, RevType.characterCastRelation),
          ),
        );

      const history = await db
        .select()
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.eq(schema.chiiRevHistory.revMid, characterID),
            op.eq(schema.chiiRevHistory.revType, RevType.characterCastRelation),
          ),
        )
        .orderBy(op.desc(schema.chiiRevHistory.revId))
        .offset(offset)
        .limit(limit);

      const users = await fetcher.fetchSlimUsersByIDs(history.map((x) => x.revCreator));

      const revisions = history.map((x) => {
        return {
          id: x.revId,
          creator: {
            username: users[x.revCreator]?.username ?? ghostUser(x.revCreator).username,
            nickname: users[x.revCreator]?.nickname ?? ghostUser(x.revCreator).nickname,
          },
          type: x.revType,
          createdAt: x.createdAt,
          commitMessage: x.revEditSummary,
        } satisfies res.IRevisionHistory;
      });

      return {
        total: count,
        data: revisions,
      };
    },
  );

  app.get(
    '/characters/-/casts/revisions/:revisionID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getCharacterCastRevisionInfo',
        summary: '获取角色-人物关联历史版本 wiki 信息',
        params: t.Object({
          revisionID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.Ref(CharacterCastRevisionWikiInfo),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('revision')),
          }),
        },
      },
    },
    async ({ params: { revisionID } }): Promise<ICharacterCastRevisionWikiInfo> => {
      const [r] = await db
        .select()
        .from(schema.chiiRevHistory)
        .where(op.eq(schema.chiiRevHistory.revId, revisionID))
        .limit(1);
      if (!r || r.revType !== RevType.characterCastRelation) {
        throw new NotFoundError(`revision ${revisionID}`);
      }

      const [revText] = await db
        .select()
        .from(schema.chiiRevText)
        .where(op.eq(schema.chiiRevText.revTextId, r.revTextId))
        .limit(1);
      if (!revText) {
        throw new NotFoundError(`RevText ${r.revTextId}`);
      }

      const revRecord = await deserializeRevText(revText.revText);
      const revContentRaw = revRecord[revisionID];
      const revContent = parseConvertedValue(CharacterCastRev, revContentRaw);
      const rels = Object.values(revContent);
      const subjectIDs = rels.map((rel) => rel.subject_id);
      const subjectsMap: Record<
        number,
        {
          id: number;
          type: number;
          name: string;
          nameCN: string;
        }
      > = {};
      const data = await db
        .select()
        .from(schema.chiiSubjects)
        .where(op.inArray(schema.chiiSubjects.id, subjectIDs));
      for (const d of data) {
        subjectsMap[d.id] = {
          id: d.id,
          type: d.typeID,
          name: d.name,
          nameCN: d.nameCN,
        };
      }

      const personIDs = rels.map((rel) => rel.prsn_id);
      const personsMap = await fetcher.fetchSlimPersonsByIDs(personIDs, true);

      const relations = rels.flatMap((rel) => {
        const subjectID = rel.subject_id;
        const personID = rel.prsn_id;

        const subject = subjectsMap[subjectID];
        const person = personsMap[personID];

        if (!subject) return [];

        return [
          {
            subject: {
              id: subjectID,
              typeID: subject.type,
              name: subject.name,
              nameCN: subject.nameCN,
            },
            person: {
              id: personID,
              name: person?.name || '',
              nameCN: person?.nameCN || '',
            },
          },
        ];
      });

      return relations;
    },
  );

  app.get(
    '/users/:username/contributions/characters',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getUserContributedCharacters',
        summary: '获取用户 wiki 角色编辑记录',
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
          200: PagedUserCharacterContribution,
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
        .select({ count: op.count(schema.chiiRevHistory.revId) })
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.eq(schema.chiiRevHistory.revCreator, user.id),
            op.inArray(schema.chiiRevHistory.revType, [RevType.characterEdit]),
          ),
        );

      const history = await db
        .select()
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.eq(schema.chiiRevHistory.revCreator, user.id),
            op.inArray(schema.chiiRevHistory.revType, [RevType.characterEdit]),
          ),
        )
        .orderBy(op.desc(schema.chiiRevHistory.revId))
        .offset(offset)
        .limit(limit);

      const characters = await fetcher.fetchSlimCharactersByIDs(history.map((r) => r.revMid));

      const revisions = history.map((r) => {
        return {
          id: r.revId,
          type: r.revType,
          characterID: r.revMid,
          name: characters[r.revMid]?.name || String(r.revMid),
          commitMessage: r.revEditSummary,
          createdAt: r.createdAt,
        } satisfies IUserCharacterContribution;
      });

      return {
        total: count,
        data: revisions,
      };
    },
  );
}
