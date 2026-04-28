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
import type { IPersonRev } from '@app/lib/rev/type.ts';
import { PersonCastRev, PersonRev, PersonSubjectRev, RevType } from '@app/lib/rev/type.ts';
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

export const PersonCareers = [
  'producer',
  'mangaka',
  'artist',
  'seiyu',
  'writer',
  'illustrator',
  'actor',
] as const;
export const PersonEditTypes = [
  RevType.personEdit,
  RevType.personErase,
  RevType.personMerge,
] as const;

type IUserPersonContribution = Static<typeof UserPersonContribution>;
const UserPersonContribution = t.Object(
  {
    id: t.Integer(),
    type: t.Integer({
      description: '3 = 人物编辑，15 = 合并，16 = 删除',
    }),
    personID: t.Integer(),
    name: t.String(),
    commitMessage: t.String(),
    createdAt: t.Integer({ description: 'unix timestamp seconds' }),
  },
  { $id: 'UserPersonContribution' },
);
export type IPagedUserPersonContribution = Static<typeof PagedUserPersonContribution>;
const PagedUserPersonContribution = res.Paged(res.Ref(UserPersonContribution));

type IPersonSubjectRevisionWikiInfo = Static<typeof PersonSubjectRevisionWikiInfo>;
export const PersonSubjectRevisionWikiInfo = t.Array(
  t.Object({
    subject: t.Object({
      id: t.Integer(),
      typeID: res.Ref(res.SubjectType),
      name: t.String(),
      nameCN: t.String(),
    }),
    position: t.Integer(),
  }),
  {
    $id: 'PersonSubjectRevisionWikiInfo',
  },
);

type IPersonCastRevisionWikiInfo = Static<typeof PersonCastRevisionWikiInfo>;
export const PersonCastRevisionWikiInfo = t.Array(
  t.Object({
    subject: t.Object({
      id: t.Integer(),
      typeID: res.Ref(res.SubjectType),
      name: t.String(),
      nameCN: t.String(),
    }),
    character: t.Object({
      id: t.Integer(),
      name: t.String(),
      nameCN: t.String(),
    }),
  }),
  {
    $id: 'PersonCastRevisionWikiInfo',
  },
);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(UserPersonContribution);
  app.addSchema(PersonSubjectRevisionWikiInfo);
  app.addSchema(PersonCastRevisionWikiInfo);

  app.get(
    '/persons/:personID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getPersonWikiInfo',
        summary: '获取人物当前的 wiki 信息',
        params: t.Object({
          personID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.Ref(res.PersonWikiInfo),
          401: res.Ref(res.Error, {
            'x-examples': formatErrors(new InvalidWikiSyntaxError()),
          }),
          404: res.Ref(res.Error, {
            description: '人物不存在',
          }),
        },
      },
    },
    async ({ params: { personID } }): Promise<res.IPersonWikiInfo> => {
      const [p] = await db
        .select()
        .from(schema.chiiPersons)
        .where(op.eq(schema.chiiPersons.id, personID))
        .limit(1);

      if (!p) {
        throw new NotFoundError(`person ${personID}`);
      }

      const profession = PersonCareers.reduce(
        (acc, c) => {
          if (p[c]) acc[c] = true;
          return acc;
        },
        {} as res.IPersonWikiInfo['profession'],
      );

      return {
        id: p.id,
        name: p.name,
        infobox: p.infobox,
        summary: p.summary,
        locked: Boolean(p.ban),
        redirect: p.redirect,
        typeID: p.type,
        profession,
      };
    },
  );

  app.post(
    '/persons',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'postPersonInfo',
        summary: '创建人物',
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: t.Object({
          person: req.PersonCreate,
          authorID: t.Optional(
            t.Integer({
              exclusiveMinimum: 0,
              description: 'when header x-admin-token is provided, use this as author id.',
            }),
          ),
        }),
        response: {
          200: t.Object({ personID: t.Integer() }),
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
      preHandler: [requireLogin('creating a person')],
    },
    async ({ auth, headers, body: { person, authorID } }) => {
      const adminToken = headers['x-admin-token'];
      if (authorID !== undefined && adminToken !== config.admin_token) {
        throw new HeaderInvalidError('invalid admin token');
      }

      if (!auth.permission.mono_edit) {
        throw new NotAllowedError('edit person');
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
        wiki = parse(person.infobox);
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

      let personID;

      await db.transaction(async (t) => {
        const { producer, mangaka, artist, seiyu, writer, illustrator, actor } =
          person.profession ?? {};

        const now = DateTime.now().toUnixInteger();
        const [{ insertId }] = await t.insert(schema.chiiPersons).values({
          name: person.name,
          type: person.type,
          infobox: person.infobox,
          summary: person.summary,
          producer: producer ? 1 : 0,
          mangaka: mangaka ? 1 : 0,
          artist: artist ? 1 : 0,
          seiyu: seiyu ? 1 : 0,
          writer: writer ? 1 : 0,
          illustrator: illustrator ? 1 : 0,
          actor: actor ? 1 : 0,
          img: '',
          comment: 0,
          collects: 0,
          createdAt: now,
          lastPost: 0,
          lock: 0,
          anidbImg: '',
          anidbId: 0,
          nsfw: false,
        } satisfies typeof schema.chiiPersons.$inferInsert);

        personID = insertId;

        let filename, raw;
        if (person.img) {
          raw = Buffer.from(person.img, 'base64');
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

          // for example raw/36/b8/${person_id}_prsn_f84d-df4e-4d49-b662-bcde71a8764f.jpg"
          filename = `raw/${h.slice(0, 2)}/${h.slice(2, 4)}/${personID}_prsn_${h}.${ext}`;
        }

        await t
          .update(schema.chiiPersons)
          .set({
            img: filename ?? '',
          })
          .where(op.eq(schema.chiiPersons.id, personID))
          .limit(1);

        const { year, month, day } = extractBirth(wiki);
        await t.insert(schema.chiiPersonFields).values({
          prsnCat: 'prsn',
          prsnId: personID,
          gender: extractGender(wiki),
          bloodtype: extractBloodType(wiki),
          birthYear: year,
          birthMon: month,
          birthDay: day,
        } satisfies typeof schema.chiiPersonFields.$inferInsert);

        const givenProfession = person.profession;
        const profession = givenProfession
          ? PersonCareers.reduce(
              (acc, c) => {
                if (givenProfession[c]) acc[c] = '1';
                return acc;
              },
              {} as IPersonRev['profession'],
            )
          : {};

        await createRevision(t, {
          mid: personID,
          type: RevType.personEdit,
          rev: {
            prsn_name: person.name,
            prsn_infobox: person.infobox,
            prsn_summary: person.summary,
            profession,
            extra: {
              img: filename ?? '',
            },
          } satisfies IPersonRev,
          creator: finalAuthorID,
          comment: '新条目',
        });

        if (filename && raw) {
          await uploadMonoImage(filename, raw);
        }
      });

      if (personID) {
        return { personID };
      } else {
        throw new Error('unknown error');
      }
    },
  );

  app.patch(
    '/persons/:personID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'patchPersonInfo',
        summary: '编辑人物',
        params: t.Object({
          personID: t.Integer({ minimum: 1 }),
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
            person: t.Partial(req.PersonEdit, { additionalProperties: false }),
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
      preHandler: [requireLogin('editing a person')],
    },
    async ({
      auth,
      headers,
      body: { commitMessage, person: input, expectedRevision, authorID },
      params: { personID },
    }) => {
      const adminToken = headers['x-admin-token'];
      if (authorID !== undefined && adminToken !== config.admin_token) {
        throw new HeaderInvalidError('invalid admin token');
      }

      if (!auth.permission.mono_edit) {
        throw new NotAllowedError('edit person');
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
          .from(schema.chiiPersons)
          .where(op.eq(schema.chiiPersons.id, personID))
          .limit(1);

        if (!p) {
          throw new NotFoundError(`person ${personID}`);
        }
        if (p.lock || p.redirect) {
          throw new LockedError();
        }

        matchExpected(expectedRevision, { name: p.name, infobox: p.infobox, summary: p.summary });

        const givenProfession = input.profession;
        const { producer, mangaka, artist, seiyu, writer, illustrator, actor } =
          givenProfession ?? {};

        const updated = {
          infobox: input.infobox ?? p.infobox,
          name: input.name ?? p.name,
          summary: input.summary ?? p.summary,
          producer: producer === undefined ? p.producer : Number(producer),
          mangaka: mangaka === undefined ? p.mangaka : Number(mangaka),
          artist: artist === undefined ? p.artist : Number(artist),
          seiyu: seiyu === undefined ? p.seiyu : Number(seiyu),
          writer: writer === undefined ? p.writer : Number(writer),
          illustrator: illustrator === undefined ? p.illustrator : Number(illustrator),
          actor: actor === undefined ? p.actor : Number(actor),
        };

        await t
          .update(schema.chiiPersons)
          .set(updated)
          .where(op.eq(schema.chiiPersons.id, personID))
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
                op.eq(schema.chiiPersonFields.prsnCat, 'prsn'),
                op.eq(schema.chiiPersonFields.prsnId, personID),
              ),
            )
            .limit(1);
        }

        const profession = givenProfession
          ? PersonCareers.reduce(
              (acc, c) => {
                if (givenProfession[c]) acc[c] = '1';
                return acc;
              },
              {} as IPersonRev['profession'],
            )
          : {};

        await createRevision(t, {
          mid: personID,
          type: RevType.personEdit,
          rev: {
            prsn_name: updated.name,
            prsn_infobox: updated.infobox,
            prsn_summary: updated.summary,
            profession,
            extra: {
              img: p.img,
            },
          } satisfies IPersonRev,
          creator: finalAuthorID,
          comment: commitMessage,
        });
      });

      return {};
    },
  );

  app.post(
    '/persons/:personID/potraits',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'uploadPersonPotrait',
        summary: '上传人物肖像',
        params: t.Object({
          personID: t.Integer({ minimum: 1 }),
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
            new NotAllowedError('edit person'),
          ),
        },
      },
      preHandler: [requireLogin('uploading image')],
    },
    async ({ auth, headers, body: { img: base64Img, authorID }, params: { personID } }) => {
      const adminToken = headers['x-admin-token'];
      if (authorID !== undefined && adminToken !== config.admin_token) {
        throw new HeaderInvalidError('invalid admin token');
      }

      if (!auth.permission.mono_edit) {
        throw new NotAllowedError('edit person');
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
        .from(schema.chiiPersons)
        .where(op.eq(schema.chiiPersons.id, personID))
        .limit(1);

      if (!p) {
        throw new NotFoundError(`person ${personID}`);
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

      // for example raw/36/b8/${person_id}_prsn_36b8f84d-df4e-4d49-b662-bcde71a8764f.jpg"
      const filename = `raw/${h.slice(0, 2)}/${h.slice(2, 4)}/${personID}_prsn_${h}.${ext}`;

      await db.transaction(async (t) => {
        await t
          .update(schema.chiiPersons)
          .set({ img: filename })
          .where(op.eq(schema.chiiPersons.id, personID))
          .limit(1);

        const profession = PersonCareers.reduce(
          (acc, c) => {
            if (p[c]) acc[c] = '1';
            return acc;
          },
          {} as IPersonRev['profession'],
        );

        await createRevision(t, {
          mid: personID,
          type: RevType.personEdit,
          rev: {
            prsn_name: p.name,
            prsn_infobox: p.infobox,
            prsn_summary: p.summary,
            profession,
            extra: {
              img: filename,
            },
          } satisfies IPersonRev,
          creator: finalAuthorID,
          comment: '新肖像',
        });

        await uploadMonoImage(filename, raw);
      });

      return { img: filename };
    },
  );

  app.get(
    '/persons/:personID/history-summary',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'personEditHistorySummary',
        summary: '获取人物 wiki 历史编辑摘要',
        params: t.Object({
          personID: t.Integer({ minimum: 1 }),
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
    async ({ params: { personID }, query: { limit = 20, offset = 0 } }) => {
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.eq(schema.chiiRevHistory.revMid, personID),
            op.inArray(schema.chiiRevHistory.revType, PersonEditTypes),
          ),
        );

      const history = await db
        .select()
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.eq(schema.chiiRevHistory.revMid, personID),
            op.inArray(schema.chiiRevHistory.revType, PersonEditTypes),
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
    '/persons/-/revisions/:revisionID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getPersonRevisionInfo',
        summary: '获取人物历史版本 wiki 信息',
        params: t.Object({
          revisionID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.Ref(res.PersonRevisionWikiInfo),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('revision')),
          }),
        },
      },
    },
    async ({ params: { revisionID } }): Promise<res.IPersonRevisionWikiInfo> => {
      const [r] = await db
        .select()
        .from(schema.chiiRevHistory)
        .where(op.eq(schema.chiiRevHistory.revId, revisionID))
        .limit(1);
      if (!r || !(PersonEditTypes as unknown as number[]).includes(r.revType)) {
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
      const revContent = parseConvertedValue(PersonRev, revContentRaw);

      return {
        name: revContent.prsn_name,
        infobox: revContent.prsn_infobox,
        summary: revContent.prsn_summary,
        profession: Object.fromEntries(
          Object.entries(revContent.profession || {}).map(([p, b]) => [p, !!b]),
        ),
        extra: revContent.extra,
      };
    },
  );

  app.get(
    '/persons/:personID/subjects/history-summary',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'personSubjectHistorySummary',
        summary: '获取人物-条目关联 wiki 历史编辑摘要',
        params: t.Object({
          personID: t.Integer({ minimum: 1 }),
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
    async ({ params: { personID }, query: { limit = 20, offset = 0 } }) => {
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.eq(schema.chiiRevHistory.revMid, personID),
            op.eq(schema.chiiRevHistory.revType, RevType.personSubjectRelation),
          ),
        );

      const history = await db
        .select()
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.eq(schema.chiiRevHistory.revMid, personID),
            op.eq(schema.chiiRevHistory.revType, RevType.personSubjectRelation),
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
    '/persons/-/subjects/revisions/:revisionID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getPersonSubjectRevisionInfo',
        summary: '获取人物-条目关联历史版本 wiki 信息',
        params: t.Object({
          revisionID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.Ref(PersonSubjectRevisionWikiInfo),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('revision')),
          }),
        },
      },
    },
    async ({ params: { revisionID } }): Promise<IPersonSubjectRevisionWikiInfo> => {
      const [r] = await db
        .select()
        .from(schema.chiiRevHistory)
        .where(op.eq(schema.chiiRevHistory.revId, revisionID))
        .limit(1);
      if (!r || r.revType !== RevType.personSubjectRelation) {
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
      const revContent = parseConvertedValue(PersonSubjectRev, revContentRaw);
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
            position: rel.position,
          },
        ];
      });

      return relations;
    },
  );

  app.get(
    '/persons/:personID/casts/history-summary',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'personCastHistorySummary',
        summary: '获取人物-角色关联 wiki 历史编辑摘要',
        params: t.Object({
          personID: t.Integer({ minimum: 1 }),
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
    async ({ params: { personID }, query: { limit = 20, offset = 0 } }) => {
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.eq(schema.chiiRevHistory.revMid, personID),
            op.eq(schema.chiiRevHistory.revType, RevType.personCastRelation),
          ),
        );

      const history = await db
        .select()
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.eq(schema.chiiRevHistory.revMid, personID),
            op.eq(schema.chiiRevHistory.revType, RevType.personCastRelation),
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
    '/persons/-/casts/revisions/:revisionID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getPersonCastRevisionInfo',
        summary: '获取人物-角色关联历史版本 wiki 信息',
        params: t.Object({
          revisionID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.Ref(PersonCastRevisionWikiInfo),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('revision')),
          }),
        },
      },
    },
    async ({ params: { revisionID } }): Promise<IPersonCastRevisionWikiInfo> => {
      const [r] = await db
        .select()
        .from(schema.chiiRevHistory)
        .where(op.eq(schema.chiiRevHistory.revId, revisionID))
        .limit(1);
      if (!r || r.revType !== RevType.personCastRelation) {
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
      const revContent = parseConvertedValue(PersonCastRev, revContentRaw);
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
      const characterIDs = rels.map((rel) => rel.crt_id);
      const charactersMap = await fetcher.fetchSlimCharactersByIDs(characterIDs, true);

      const relations = rels.flatMap((rel) => {
        const subjectID = rel.subject_id;
        const characterID = rel.crt_id;

        const subject = subjectsMap[subjectID];
        const character = charactersMap[characterID];

        if (!subject) return [];

        return [
          {
            subject: {
              id: subjectID,
              typeID: subject.type,
              name: subject.name,
              nameCN: subject.nameCN,
            },
            character: {
              id: characterID,
              name: character?.name || '',
              nameCN: character?.nameCN || '',
            },
          },
        ];
      });

      return relations;
    },
  );

  app.get(
    '/users/:username/contributions/persons',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getUserContributedPersons',
        summary: '获取用户 wiki 人物编辑记录',
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
          200: PagedUserPersonContribution,
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
            op.inArray(schema.chiiRevHistory.revType, PersonEditTypes),
          ),
        );

      const history = await db
        .select()
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.eq(schema.chiiRevHistory.revCreator, user.id),
            op.inArray(schema.chiiRevHistory.revType, PersonEditTypes),
          ),
        )
        .orderBy(op.desc(schema.chiiRevHistory.revId))
        .offset(offset)
        .limit(limit);

      const persons = await fetcher.fetchSlimPersonsByIDs(history.map((r) => r.revMid));

      const revisions = history.map((r) => {
        return {
          id: r.revId,
          type: r.revType,
          personID: r.revMid,
          name: persons[r.revMid]?.name || String(r.revMid),
          commitMessage: r.revEditSummary,
          createdAt: r.createdAt,
        } satisfies IUserPersonContribution;
      });

      return {
        total: count,
        data: revisions,
      };
    },
  );
}
