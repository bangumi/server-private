import type { Static } from 'typebox';
import t from 'typebox';

import { db, op, schema } from '@app/drizzle';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { LockedError, NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { createRevision } from '@app/lib/rev/common.ts';
import type { CharacterCastRev, CharacterRev, CharacterSubjectRev } from '@app/lib/rev/type.ts';
import { RevType } from '@app/lib/rev/type.ts';
import { deserializeRevText } from '@app/lib/rev/utils.ts';
import { InvalidWikiSyntaxError } from '@app/lib/subject/index.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import { ghostUser } from '@app/lib/user/utils';
import { matchExpected, WikiChangedError } from '@app/lib/wiki.ts';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

export const CharacterWikiInfo = t.Object(
  {
    id: t.Integer(),
    name: t.String(),
    infobox: t.String(),
    summary: t.String(),
  },
  { $id: 'CharacterWikiInfo' },
);

export const CharacterEdit = t.Object(
  {
    name: t.String({ minLength: 1 }),
    infobox: t.String({ minLength: 1 }),
    summary: t.String(),
  },
  {
    $id: 'CharacterEdit',
    additionalProperties: false,
  },
);

type ICharacterRevisionWikiInfo = Static<typeof CharacterRevisionWikiInfo>;
export const CharacterRevisionWikiInfo = t.Object(
  {
    name: t.String(),
    infobox: t.String(),
    summary: t.String(),
    extra: t.Object({
      img: t.Optional(t.String()),
    }),
  },
  {
    $id: 'CharacterRevisionWikiInfo',
  },
);

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
  app.addSchema(CharacterWikiInfo);
  app.addSchema(CharacterRevisionWikiInfo);
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
          200: res.Ref(CharacterWikiInfo),
          401: res.Ref(res.Error, {
            'x-examples': formatErrors(new InvalidWikiSyntaxError()),
          }),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('character')),
          }),
        },
      },
    },
    async ({ params: { characterID } }): Promise<Static<typeof CharacterWikiInfo>> => {
      const [c] = await db
        .select()
        .from(schema.chiiCharacters)
        .where(op.eq(schema.chiiCharacters.id, characterID))
        .limit(1);
      if (!c) {
        throw new NotFoundError(`character ${characterID}`);
      }

      if (c.lock) {
        throw new NotAllowedError('edit a locked character');
      }

      return {
        id: c.id,
        name: c.name,
        infobox: c.infobox,
        summary: c.summary,
      };
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
            expectedRevision: t.Partial(CharacterEdit, {
              default: {},
              additionalProperties: false,
            }),
            character: t.Partial(CharacterEdit, { additionalProperties: false }),
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
        },
      },
      preHandler: [requireLogin('editing a subject info')],
    },
    async ({
      auth,
      body: { commitMessage, character: input, expectedRevision },
      params: { characterID },
    }) => {
      if (!auth.permission.mono_edit) {
        throw new NotAllowedError('edit character');
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
          } satisfies CharacterRev,
          creator: auth.userID,
          comment: commitMessage,
        });
      });

      return {};
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
          200: res.Ref(CharacterRevisionWikiInfo),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('revision')),
          }),
        },
      },
    },
    async ({ params: { revisionID } }): Promise<ICharacterRevisionWikiInfo> => {
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
      const revContent = revRecord[revisionID] as CharacterRev;

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
      const revContent = revRecord[revisionID] as CharacterSubjectRev;
      const rels = Object.values(revContent);
      const subjectIDs = rels.map((rel) => +rel.subject_id);
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
        const subjectID = +rel.subject_id;
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
            type: +rel.crt_type,
            order: +rel.crt_order,
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
      const revContent = revRecord[revisionID] as CharacterCastRev;
      const rels = Object.values(revContent);
      const subjectIDs = rels.map((rel) => +rel.subject_id);
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

      const personIDs = rels.map((rel) => +rel.prsn_id);
      const personsMap = await fetcher.fetchSlimPersonsByIDs(personIDs, true);

      const relations = rels.flatMap((rel) => {
        const subjectID = +rel.subject_id;
        const personID = +rel.prsn_id;

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
