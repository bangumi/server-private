import type { Static } from 'typebox';
import t from 'typebox';

import { db, op, schema } from '@app/drizzle';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { LockedError, NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import type { PersonRev } from '@app/lib/orm/entity/index.ts';
import { createRevision, RevType } from '@app/lib/orm/entity/index.ts';
import * as entity from '@app/lib/orm/entity/index.ts';
import { AppDataSource } from '@app/lib/orm/index.ts';
import { InvalidWikiSyntaxError } from '@app/lib/subject/index.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import { ghostUser } from '@app/lib/user/utils';
import { matchExpected, WikiChangedError } from '@app/lib/wiki.ts';
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

export const PersonProfessions = t.Object({
  producer: t.Optional(t.Boolean()),
  mangaka: t.Optional(t.Boolean()),
  artist: t.Optional(t.Boolean()),
  seiyu: t.Optional(t.Boolean()),
  writer: t.Optional(t.Boolean()),
  illustrator: t.Optional(t.Boolean()),
  actor: t.Optional(t.Boolean()),
});

type IPersonWikiInfo = Static<typeof PersonWikiInfo>;
export const PersonWikiInfo = t.Object(
  {
    id: t.Integer(),
    name: t.String(),
    typeID: res.Ref(res.PersonType),
    infobox: t.String(),
    summary: t.String(),
    profession: PersonProfessions,
  },
  { $id: 'PersonWikiInfo' },
);

export const PersonEdit = t.Object(
  {
    name: t.String({ minLength: 1 }),
    infobox: t.String({ minLength: 1 }),
    summary: t.String(),
  },
  {
    $id: 'PersonEdit',
    additionalProperties: false,
  },
);

type IPersonRevisionWikiInfo = Static<typeof PersonRevisionWikiInfo>;
export const PersonRevisionWikiInfo = t.Object(
  {
    name: t.String(),
    infobox: t.String(),
    summary: t.String(),
    profession: PersonProfessions,
    extra: t.Object({
      img: t.Optional(t.String()),
    }),
  },
  {
    $id: 'PersonRevisionWikiInfo',
  },
);

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

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(res.PersonType);
  app.addSchema(PersonWikiInfo);
  app.addSchema(PersonRevisionWikiInfo);
  app.addSchema(UserPersonContribution);

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
          200: res.Ref(PersonWikiInfo),
          401: res.Ref(res.Error, {
            'x-examples': formatErrors(new InvalidWikiSyntaxError()),
          }),
          404: res.Ref(res.Error, {
            description: '人物不存在',
          }),
        },
      },
    },
    async ({ params: { personID } }): Promise<IPersonWikiInfo> => {
      const [p] = await db
        .select()
        .from(schema.chiiPersons)
        .where(op.eq(schema.chiiPersons.id, personID))
        .limit(1);

      if (!p) {
        throw new NotFoundError(`person ${personID}`);
      }

      if (p.lock) {
        throw new NotAllowedError('edit a locked person');
      }

      const profession = PersonCareers.reduce(
        (acc, c) => {
          if (p[c]) acc[c] = true;
          return acc;
        },
        {} as IPersonWikiInfo['profession'],
      );

      return {
        id: p.id,
        name: p.name,
        infobox: p.infobox,
        summary: p.summary,
        typeID: p.type,
        profession,
      };
    },
  );

  app.patch(
    '/persons/:personID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'patchPersonInfo',
        params: t.Object({
          personID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: t.Object(
          {
            commitMessage: t.String({ minLength: 1 }),
            expectedRevision: t.Partial(PersonEdit, { default: {}, additionalProperties: false }),
            person: t.Partial(PersonEdit, { additionalProperties: false }),
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
      body: { commitMessage, person: input, expectedRevision },
      params: { personID },
    }) => {
      if (!auth.permission.mono_edit) {
        throw new NotAllowedError('edit person');
      }

      await AppDataSource.transaction(async (t) => {
        const PersonRepo = t.getRepository(entity.Person);
        const p = await PersonRepo.findOneBy({ id: personID });
        if (!p) {
          throw new NotFoundError(`person ${personID}`);
        }
        if (p.lock || p.redirect) {
          throw new LockedError();
        }

        matchExpected(expectedRevision, { name: p.name, infobox: p.infobox, summary: p.summary });

        p.infobox = input.infobox ?? p.infobox;
        p.name = input.name ?? p.name;
        p.summary = input.summary ?? p.summary;

        await PersonRepo.save(p);

        const profession = PersonCareers.reduce(
          (acc, c) => {
            if (p[c]) acc[c] = '1';
            return acc;
          },
          {} as PersonRev['profession'],
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
              img: p.img,
            },
          } satisfies PersonRev,
          creator: auth.userID,
          comment: commitMessage,
        });
      });

      return {};
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
        .select({ count: op.countDistinct(schema.chiiRevHistory.revId) })
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
          200: res.Ref(PersonRevisionWikiInfo),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('revision')),
          }),
        },
      },
    },
    async ({ params: { revisionID } }): Promise<IPersonRevisionWikiInfo> => {
      const [r] = await db
        .select()
        .from(schema.chiiRevHistory)
        .where(op.eq(schema.chiiRevHistory.revId, revisionID));
      if (!r) {
        throw new NotFoundError(`revision ${revisionID}`);
      }

      const [revText] = await db
        .select()
        .from(schema.chiiRevText)
        .where(op.eq(schema.chiiRevText.revTextId, r.revTextId));
      if (!revText) {
        throw new NotFoundError(`RevText ${r.revTextId}`);
      }

      const revRecord = await entity.RevText.deserialize(revText.revText);
      const revContent = revRecord[revisionID] as PersonRev;

      return {
        name: revContent.prsn_name,
        infobox: revContent.prsn_infobox,
        summary: revContent.prsn_summary,
        profession: Object.fromEntries(
          Object.entries(revContent.profession).map(([p, b]) => [p, !!b]),
        ),
        extra: revContent.extra,
      };
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
        .select({ count: op.countDistinct(schema.chiiRevHistory.revId) })
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
